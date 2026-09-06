#!/usr/bin/env python3
"""G0.4 S2 — SQLite durability / backup / restore / migration spike.

EXPLORATION / NOT CANONICAL ARCHITECTURE / NOT PRODUCTION COMMITMENT
"""
from __future__ import annotations

import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

SCHEMA_V1 = """
PRAGMA foreign_keys = ON;
CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO meta(key, value) VALUES ('schema_version', '1');
CREATE TABLE track(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE plan_item(
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    track_id TEXT REFERENCES track(id)
);
"""


def q1(conn: sqlite3.Connection, sql: str, args=()):
    return conn.execute(sql, args).fetchone()[0]


def integrity(conn: sqlite3.Connection) -> str:
    return q1(conn, "PRAGMA integrity_check")


def columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})")]


def create_v1(db: Path) -> None:
    conn = sqlite3.connect(db)
    try:
        conn.executescript(SCHEMA_V1)
        conn.execute("INSERT INTO track(id,name) VALUES (?,?)", ("trk-cpa", "CPA"))
        conn.execute(
            "INSERT INTO plan_item(id,title,track_id) VALUES (?,?,?)",
            ("plan-1", "Study accounting", "trk-cpa"),
        )
        conn.commit()
        assert integrity(conn) == "ok"
    finally:
        conn.close()


def child_uncommitted_crash(db: Path) -> int:
    script = r'''
import os, sqlite3, sys
p=sys.argv[1]
conn=sqlite3.connect(p)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA synchronous=FULL")
conn.execute("BEGIN IMMEDIATE")
conn.execute("UPDATE track SET name='CORRUPT_IF_COMMITTED' WHERE id='trk-cpa'")
# Crash without COMMIT / close.
os._exit(73)
'''
    return subprocess.run([sys.executable, "-c", script, str(db)]).returncode


def online_backup(src: Path, dst: Path) -> None:
    s = sqlite3.connect(src)
    d = sqlite3.connect(dst)
    try:
        s.backup(d)
        d.commit()
        assert integrity(d) == "ok"
    finally:
        d.close()
        s.close()


def validate_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    try:
        assert integrity(conn) == "ok"
        assert q1(conn, "SELECT value FROM meta WHERE key='schema_version'") in {"1", "2"}
    finally:
        conn.close()


def migrate_copy(src: Path, dst: Path) -> None:
    shutil.copy2(src, dst)
    conn = sqlite3.connect(dst)
    try:
        assert q1(conn, "SELECT value FROM meta WHERE key='schema_version'") == "1"
        conn.execute("BEGIN IMMEDIATE")
        try:
            conn.execute("ALTER TABLE track ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
            conn.execute("UPDATE meta SET value='2' WHERE key='schema_version'")
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        assert q1(conn, "SELECT value FROM meta WHERE key='schema_version'") == "2"
        assert "status" in columns(conn, "track")
        assert q1(conn, "SELECT status FROM track WHERE id='trk-cpa'") == "active"
        assert integrity(conn) == "ok"
    finally:
        conn.close()


def failed_migration_rolls_back(src: Path, dst: Path) -> None:
    shutil.copy2(src, dst)
    conn = sqlite3.connect(dst)
    try:
        assert q1(conn, "SELECT value FROM meta WHERE key='schema_version'") == "1"
        failed = False
        conn.execute("BEGIN IMMEDIATE")
        try:
            conn.execute("ALTER TABLE track ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
            conn.execute("UPDATE meta SET value='2' WHERE key='schema_version'")
            # Deliberate failure after schema/data changes but before COMMIT.
            conn.execute("INSERT INTO definitely_missing_table(x) VALUES (1)")
            conn.commit()
        except sqlite3.DatabaseError:
            failed = True
            conn.rollback()
        assert failed
        assert q1(conn, "SELECT value FROM meta WHERE key='schema_version'") == "1"
        assert "status" not in columns(conn, "track")
        assert integrity(conn) == "ok"
    finally:
        conn.close()


def main() -> int:
    out = {
        "spike": "S2",
        "status": "PASS",
        "checks": {},
        "python": sys.version,
        "sqlite": sqlite3.sqlite_version,
        "platform": sys.platform,
    }
    with tempfile.TemporaryDirectory(prefix="g04-s2-") as td:
        root = Path(td)
        live = root / "workbench.db"
        backup = root / "backup.db"
        migrated = root / "migrated.db"
        failed_migration = root / "failed-migration.db"

        create_v1(live)
        out["checks"]["create_v1_integrity"] = True

        rc = child_uncommitted_crash(live)
        assert rc == 73
        conn = sqlite3.connect(live)
        try:
            assert q1(conn, "SELECT name FROM track WHERE id='trk-cpa'") == "CPA"
            assert integrity(conn) == "ok"
        finally:
            conn.close()
        out["checks"]["uncommitted_crash_rolled_back"] = True

        # Committed state survives close/reopen.
        conn = sqlite3.connect(live)
        conn.execute("UPDATE track SET name='CPA 2027' WHERE id='trk-cpa'")
        conn.commit()
        conn.close()
        conn = sqlite3.connect(live)
        try:
            assert q1(conn, "SELECT name FROM track WHERE id='trk-cpa'") == "CPA 2027"
        finally:
            conn.close()
        out["checks"]["committed_restart_persists"] = True

        # Consistent standalone backup from the live database.
        online_backup(live, backup)
        validate_db(backup)
        out["checks"]["online_backup_integrity"] = True

        # Destructive change to canonical DB.
        conn = sqlite3.connect(live)
        conn.execute("DELETE FROM plan_item")
        conn.execute("DELETE FROM track")
        conn.commit()
        conn.close()

        # Pre-restore safety snapshot preserves the current (destructively changed) state.
        safety = root / "pre-restore-safety.db"
        online_backup(live, safety)
        conn = sqlite3.connect(safety)
        try:
            assert q1(conn, "SELECT COUNT(*) FROM track") == 0
            assert integrity(conn) == "ok"
        finally:
            conn.close()
        out["checks"]["pre_restore_safety_snapshot"] = True

        # Validate backup, stage it, then replace the CLOSED canonical DB on Windows.
        validate_db(backup)
        staging = root / "restore-staging.db"
        shutil.copy2(backup, staging)
        validate_db(staging)
        os.replace(staging, live)
        conn = sqlite3.connect(live)
        try:
            assert integrity(conn) == "ok"
            assert q1(conn, "SELECT COUNT(*) FROM track") == 1
            assert q1(conn, "SELECT COUNT(*) FROM plan_item") == 1
            assert q1(conn, "SELECT name FROM track WHERE id='trk-cpa'") == "CPA 2027"
        finally:
            conn.close()
        out["checks"]["canonical_db_replaced_from_validated_backup"] = True

        migrate_copy(backup, migrated)
        out["checks"]["v1_fixture_migrates_to_v2_transactionally"] = True

        failed_migration_rolls_back(backup, failed_migration)
        out["checks"]["failed_migration_rolls_back_schema_and_version"] = True

        # A deliberately invalid file is rejected before restore.
        invalid = root / "invalid.db"
        invalid.write_bytes(b"not-a-sqlite-database")
        rejected = False
        try:
            c = sqlite3.connect(invalid)
            try:
                c.execute("PRAGMA integrity_check").fetchall()
            finally:
                c.close()
        except sqlite3.DatabaseError:
            rejected = True
        assert rejected
        out["checks"]["invalid_backup_rejected"] = True

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
