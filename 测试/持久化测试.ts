import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { openWorkbench } from "../src/个人状态/L3_外交层/状态公开接口";
import {
  connect,
  APP_ID,
  VERSION,
  migrations,
  validateDatabase,
  version,
} from "../src/个人状态/L1_器件层/数据库结构";
import { migrate } from "../src/个人状态/L1_器件层/数据库连接器";
const draft = {
  name: "CPA",
  goal: "考试",
  phase: "会计",
  realState: "第一章",
  direction: "练习",
  status: "Active" as const,
};
test("restart、独立备份、无效恢复拒绝、staged restore 与安全备份", () => {
  const dir = mkdtempSync(join(tmpdir(), "pwb-recovery-"));
  const path = join(dir, "live.sqlite");
  let app = openWorkbench(path);
  try {
    const track = app.saveTrack(null, draft);
    const item = app.saveItem(null, {
      title: "练习",
      date: "2026-09-06",
      startTime: "09:00",
      endTime: "10:00",
      trackId: track,
    });
    app.saveVector(null, {
      content: "方向",
      startDate: "2026-09-06",
      endDate: "2026-09-06",
    });
    app.acknowledge("2026-09-06", `item:${item}`, true);
    const expected = app.view("2026-09-06");
    app.close();
    app = openWorkbench(path);
    assert.deepEqual(app.view("2026-09-06"), expected);
    const backup = join(dir, "backup.sqlite");
    app.backup(backup);
    const independent = openWorkbench(backup);
    assert.deepEqual(independent.view("2026-09-06"), expected);
    independent.close();
    app.saveTrack(track, { ...draft, name: "备份后变更" });
    const before = app.view("2026-09-06");
    const invalid = join(dir, "invalid.sqlite");
    writeFileSync(invalid, "not sqlite");
    assert.throws(() => app.restore(invalid));
    assert.deepEqual(app.view("2026-09-06"), before);
    const foreign = connect(join(dir, "foreign.sqlite"));
    foreign.exec(
      `PRAGMA application_id=${APP_ID}; PRAGMA user_version=${VERSION}; CREATE TABLE unrelated(x);`,
    );
    foreign.close();
    assert.throws(() => app.restore(join(dir, "foreign.sqlite")), /结构/);
    assert.deepEqual(app.view("2026-09-06"), before);
    const safety = app.restore(backup);
    assert.ok(existsSync(safety));
    assert.deepEqual(app.view("2026-09-06"), expected);
    const saved = openWorkbench(safety);
    assert.deepEqual(saved.view("2026-09-06"), before);
    saved.close();
    app.close();
    app = openWorkbench(path);
    assert.deepEqual(app.view("2026-09-06"), expected);
    assert.throws(() => app.backup(backup), /已存在/);
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
});
test("真实进程中断未提交写入后重开无部分事实", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pwb-crash-"));
  const path = join(dir, "live.sqlite");
  const app = openWorkbench(path);
  app.saveTrack(null, draft);
  app.close();
  try {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1]);db.exec("BEGIN IMMEDIATE; UPDATE tracks SET name='uncommitted'");process.stdout.write('READY');setInterval(()=>{},1000);`,
        path,
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    await new Promise<void>((resolve, reject) => {
      child.stdout.once("data", () => resolve());
      child.once("error", reject);
      child.once("exit", (code) => reject(new Error(`premature exit ${code}`)));
    });
    const ended = new Promise<void>((resolve) =>
      child.once("exit", () => resolve()),
    );
    child.kill("SIGKILL");
    await ended;
    const reopened = openWorkbench(path);
    assert.equal(reopened.view().tracks[0].name, "CPA");
    reopened.close();
    const db = connect(path, true);
    validateDatabase(db);
    db.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test("旧版 fixture 按序升级，升级前快照保留旧版；失败 DDL/version/data 全部回滚", () => {
  const dir = mkdtempSync(join(tmpdir(), "pwb-migration-"));
  const path = join(dir, "legacy.sqlite");
  try {
    const db = connect(path);
    db.exec(
      `PRAGMA application_id=${APP_ID};${migrations[0]} PRAGMA user_version=1;`,
    );
    db.prepare("INSERT INTO tracks VALUES(?,?,?,?,?,?,?,?)").run(
      "stable",
      "CPA",
      "goal",
      "phase",
      "state",
      "direction",
      "Active",
      new Date().toISOString(),
    );
    db.prepare("INSERT INTO items VALUES(?,?,?,?,?,?)").run(
      "linked",
      "练习",
      "2026-09-06",
      "09:00",
      "10:00",
      "stable",
    );
    assert.throws(
      () =>
        migrate(db, [
          migrations[0],
          `${migrations[1]} UPDATE tracks SET name='bad'; PRAGMA user_version=2; CREATE TABLE partial(x); SELECT * FROM missing;`,
        ]),
      /回滚/,
    );
    assert.equal(version(db), 1);
    assert.equal(db.prepare("SELECT name FROM tracks").get()!.name, "CPA");
    assert.equal(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name IN ('partial','acknowledgements')",
        )
        .all().length,
      0,
    );
    validateDatabase(db);
    db.close();
    const originalStep = migrations[1];
    try {
      migrations[1] = `${originalStep} UPDATE tracks SET name='bad'; SELECT * FROM missing;`;
      assert.throws(() => openWorkbench(path), /回滚/);
    } finally {
      migrations[1] = originalStep;
    }
    const rolledBack = connect(path, true);
    assert.equal(version(rolledBack), 1);
    assert.equal(
      rolledBack.prepare("SELECT name FROM tracks").get()!.name,
      "CPA",
    );
    validateDatabase(rolledBack);
    rolledBack.close();
    const upgraded = openWorkbench(path);
    assert.equal(upgraded.view().tracks[0].id, "stable");
    assert.equal(upgraded.view().items[0].trackId, "stable");
    upgraded.close();
    const safety = readdirSync(join(dir, "safety"));
    assert.equal(safety.length, 2);
    const old = connect(join(dir, "safety", safety[0]), true);
    assert.equal(version(old), 1);
    validateDatabase(old);
    old.close();
    const current = connect(path, true);
    assert.equal(version(current), VERSION);
    validateDatabase(current);
    current.close();
    const fresh = openWorkbench(join(dir, "restore-target.sqlite"));
    fresh.restore(join(dir, "safety", safety[0]));
    assert.equal(fresh.view().tracks[0].id, "stable");
    fresh.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("恢复后 reopen 失败使用安全快照补偿，补偿失败发出致命错误", async () => {
  const { Store } = await import("../src/个人状态/L1_器件层/数据库连接器");
  const dir = mkdtempSync(join(tmpdir(), "pwb-reopen-"));
  const path = join(dir, "live.sqlite");
  const app = openWorkbench(path);
  app.saveTrack(null, draft);
  app.backup(join(dir, "backup.sqlite"));
  app.saveTrack(app.view().tracks[0].id, { ...draft, name: "live truth" });
  app.close();
  const store = new Store(path);
  const originalOpen = store.open.bind(store);
  let failOnce = true;
  store.open = () => {
    if (failOnce) {
      failOnce = false;
      throw new Error("injected reopen failure");
    }
    originalOpen();
  };
  try {
    assert.throws(
      () => store.restore(join(dir, "backup.sqlite")),
      /已重新打开/,
    );
    assert.equal(
      store.db.prepare("SELECT name FROM tracks").get()!.name,
      "live truth",
    );
    store.open = () => {
      throw new Error("injected persistent reopen failure");
    };
    assert.throws(
      () => store.restore(join(dir, "backup.sqlite")),
      AggregateError,
    );
    assert.ok(readdirSync(join(dir, "safety")).length >= 2);
    const recovery = openWorkbench(path);
    assert.equal(recovery.view().tracks[0].name, "live truth");
    recovery.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
