import { DatabaseSync } from "node:sqlite";
import {
  validateTrack,
  validateItem,
  validateVector,
  dateOnly,
  type Track,
  type Item,
  type Vector,
} from "../L0_公理层/状态契约";

export const APP_ID = 0x50574231;
export const VERSION = 2;
// v1 包含真实 Track/Plan；v2 增加本任务必须的窄 acknowledgement，无未来字段。
export const migrations = [
  `CREATE TABLE tracks (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, goal TEXT NOT NULL, phase TEXT NOT NULL, realState TEXT NOT NULL, direction TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Active','Completed','Archived')), updatedAt TEXT NOT NULL);
   CREATE TABLE items (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, startTime TEXT NOT NULL, endTime TEXT NOT NULL, trackId TEXT REFERENCES tracks(id));
   CREATE TABLE vectors (id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL);`,
  `CREATE TABLE acknowledgements (date TEXT NOT NULL, sourceId TEXT NOT NULL, acknowledged INTEGER NOT NULL CHECK(acknowledged IN (0,1)), PRIMARY KEY(date,sourceId));`,
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
  if (v >= 2)
    for (const r of db.prepare("SELECT * FROM acknowledgements").all()) {
      dateOnly(r.date);
      if (
        typeof r.sourceId !== "string" ||
        !/^(item|vector):.+/.test(r.sourceId)
      )
        throw new Error("确认身份无效");
    }
}
