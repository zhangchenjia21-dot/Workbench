import {
  repositoryName,
  validateProjectSnapshot,
} from "../L0_公理层/项目来源契约";
import { DatabaseSync } from "node:sqlite";
import {
  validateSeries,
  validateOriginalKey,
  validateReminder,
  validateMemo,
  validateUnscheduled,
  textField,
  type Series,
  type Reminder,
  type Memo,
  type Unscheduled,
  type OccurrenceException,
  validateTrack,
  validateItem,
  validateVector,
  dateOnly,
  type Track,
  type Item,
  type Vector,
} from "../L0_公理层/状态契约";

export const APP_ID = 0x50574231;
export const VERSION = 4;
// 原 v1/v2 DDL 保持字节兼容；v3 只增加 Complete V0 的事实表，无预生成 occurrence。
export const migrations = [
  `CREATE TABLE tracks (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, goal TEXT NOT NULL, phase TEXT NOT NULL, realState TEXT NOT NULL, direction TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Active','Completed','Archived')), updatedAt TEXT NOT NULL);
   CREATE TABLE items (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, startTime TEXT NOT NULL, endTime TEXT NOT NULL, trackId TEXT REFERENCES tracks(id));
   CREATE TABLE vectors (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL);`,
  `CREATE TABLE acknowledgements (date TEXT NOT NULL, sourceId TEXT NOT NULL, acknowledged INTEGER NOT NULL CHECK(acknowledged IN (0,1)), PRIMARY KEY(date,sourceId));`,
  `CREATE TABLE series (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT, startTime TEXT NOT NULL, endTime TEXT NOT NULL, pattern TEXT NOT NULL CHECK(pattern IN ('daily','weekly')), weekdays TEXT NOT NULL, trackId TEXT REFERENCES tracks(id));
   CREATE TABLE exceptions (seriesId TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE, originalKey TEXT NOT NULL, deleted INTEGER NOT NULL CHECK(deleted IN (0,1)), title TEXT, date TEXT, startTime TEXT, endTime TEXT, trackId TEXT REFERENCES tracks(id), PRIMARY KEY(seriesId,originalKey), CHECK((deleted=1 AND title IS NULL AND date IS NULL AND startTime IS NULL AND endTime IS NULL AND trackId IS NULL) OR (deleted=0 AND title IS NOT NULL AND date IS NOT NULL AND startTime IS NOT NULL AND endTime IS NOT NULL)));
   CREATE TABLE reminders (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, date TEXT NOT NULL, time TEXT);
   CREATE TABLE memos (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, date TEXT NOT NULL);
   CREATE TABLE unscheduled (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, trackId TEXT REFERENCES tracks(id));`,
  `CREATE TABLE project_sources (id TEXT PRIMARY KEY NOT NULL, repository TEXT UNIQUE NOT NULL, trackId TEXT REFERENCES tracks(id), checkedAt TEXT, error TEXT);
   CREATE TABLE project_updates (sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, sourceId TEXT NOT NULL REFERENCES project_sources(id) ON DELETE CASCADE, fetchedAt TEXT NOT NULL, payload TEXT NOT NULL, disposition TEXT NOT NULL CHECK(disposition IN ('new','seen','applied')));`,
];
export function version(db: DatabaseSync): number {
  return Number(db.prepare("PRAGMA user_version").get()!.user_version);
}
export function connect(path: string, readOnly = false): DatabaseSync {
  const db = new DatabaseSync(path, { readOnly });
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF; PRAGMA busy_timeout=5000;",
  );
  if (!readOnly)
    db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;");
  return db;
}
function structure(db: DatabaseSync): string {
  return JSON.stringify(
    db
      .prepare(
        "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
      )
      .all(),
  );
}
/** 在只读候选库上核对身份、精确结构、完整性与领域事实；不信任仅带 application_id 的外来文件。 */
export function validateDatabase(db: DatabaseSync): void {
  const v = version(db);
  if (
    Number(db.prepare("PRAGMA application_id").get()!.application_id) !==
      APP_ID ||
    v < 1 ||
    v > VERSION
  )
    throw new Error("不是受支持的 Workbench 数据库");
  if (
    db.prepare("PRAGMA integrity_check").get()!.integrity_check !== "ok" ||
    db.prepare("PRAGMA foreign_key_check").all().length
  )
    throw new Error("数据库完整性检查失败");
  const expected = new DatabaseSync(":memory:");
  try {
    for (const sql of migrations.slice(0, v)) expected.exec(sql);
    if (structure(db) !== structure(expected))
      throw new Error("Workbench 数据库结构不匹配");
  } finally {
    expected.close();
  }
  for (const r of db.prepare("SELECT * FROM tracks").all()) {
    validateTrack(r as unknown as Track);
    if (
      typeof r.id !== "string" ||
      !r.id ||
      typeof r.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(r.updatedAt))
    )
      throw new Error("Track 身份或更新时间无效");
  }
  for (const r of db.prepare("SELECT * FROM items").all()) {
    validateItem(r as unknown as Item);
    if (!r.id) throw new Error("日程身份无效");
  }
  for (const r of db.prepare("SELECT * FROM vectors").all()) {
    validateVector(r as unknown as Vector);
    if (!r.id) throw new Error("Vector 身份无效");
  }
  if (
    db
      .prepare(
        "SELECT 1 FROM vectors a JOIN vectors b ON a.id < b.id AND a.startDate <= b.endDate AND b.startDate <= a.endDate LIMIT 1",
      )
      .get()
  )
    throw new Error("Vector 日期重叠");
  if (v >= 3) {
    const series = readSeries(db);
    for (const s of series) {
      textField(s.id, "Series ID", true);
      validateSeries(s);
    }
    for (const e of readExceptions(db)) {
      validateOriginalKey(
        series.find((s) => s.id === e.seriesId)!,
        e.originalKey,
      );
      if (!e.deleted) validateItem(e.value);
    }
    for (const r of db.prepare("SELECT * FROM reminders").all()) {
      textField(r.id, "Reminder ID", true);
      validateReminder(r as unknown as Reminder);
    }
    for (const r of db.prepare("SELECT * FROM memos").all()) {
      textField(r.id, "Memo ID", true);
      validateMemo(r as unknown as Memo);
    }
    for (const r of db.prepare("SELECT * FROM unscheduled").all()) {
      textField(r.id, "Unscheduled ID", true);
      validateUnscheduled(r as unknown as Unscheduled);
    }
  }
  if (v >= 4) {
    const sources = db.prepare("SELECT * FROM project_sources").all();
    if (sources.length > 3) throw Error("项目来源数量无效");
    for (const r of sources) {
      textField(r.id, "Source ID", true);
      if (
        typeof r.repository !== "string" ||
        repositoryName(r.repository) !== r.repository ||
        (r.checkedAt !== null &&
          (typeof r.checkedAt !== "string" ||
            !Number.isFinite(Date.parse(r.checkedAt)))) ||
        (r.error !== null &&
          (typeof r.error !== "string" || r.error.length > 1000))
      )
        throw Error("项目来源无效");
      const updates = db
        .prepare(
          "SELECT * FROM project_updates WHERE sourceId=? ORDER BY sequence",
        )
        .all(r.id);
      if (updates.length > 20) throw Error("项目快照数量无效");
      let repositoryId: number | undefined;
      for (const u of updates) {
        textField(u.id, "Update ID", true);
        if (
          typeof u.payload !== "string" ||
          u.payload.length > 100000 ||
          typeof u.fetchedAt !== "string" ||
          !Number.isFinite(Date.parse(u.fetchedAt))
        )
          throw Error("项目快照无效");
        const snapshot = JSON.parse(u.payload);
        validateProjectSnapshot(snapshot);
        if (
          snapshot.repository !== r.repository ||
          (repositoryId !== undefined && repositoryId !== snapshot.repositoryId)
        )
          throw Error("项目来源身份不匹配");
        repositoryId = snapshot.repositoryId;
      }
    }
  }

  if (v >= 2)
    for (const r of db.prepare("SELECT * FROM acknowledgements").all()) {
      dateOnly(r.date);
      if (
        typeof r.sourceId !== "string" ||
        !(v >= 3 ? /^(item|vector|occurrence):.+/ : /^(item|vector):.+/).test(
          r.sourceId,
        )
      )
        throw new Error("确认身份无效");
    }
}

export function readSeries(db: DatabaseSync): Series[] {
  return db
    .prepare("SELECT * FROM series ORDER BY startDate,id")
    .all()
    .map((r) => ({
      ...r,
      weekdays: JSON.parse(String(r.weekdays)),
    })) as unknown as Series[];
}
export function readExceptions(db: DatabaseSync): OccurrenceException[] {
  return db
    .prepare("SELECT * FROM exceptions ORDER BY seriesId,originalKey")
    .all()
    .map((r) =>
      r.deleted
        ? {
            seriesId: String(r.seriesId),
            originalKey: String(r.originalKey),
            deleted: true,
          }
        : {
            seriesId: String(r.seriesId),
            originalKey: String(r.originalKey),
            deleted: false,
            value: {
              title: String(r.title),
              date: String(r.date),
              startTime: String(r.startTime),
              endTime: String(r.endTime),
              trackId: r.trackId as string | null,
            },
          },
    );
}
