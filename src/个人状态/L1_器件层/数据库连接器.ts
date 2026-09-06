import { type DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  APP_ID,
  VERSION,
  migrations,
  connect,
  version,
  validateDatabase,
} from "./数据库结构";

/** 主进程独占连接；同步操作使写入、备份和恢复串行，renderer 不持有数据库句柄。 */
export class Store {
  db!: DatabaseSync;
  constructor(readonly path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.open();
  }
  open(): void {
    const existed = existsSync(this.path);
    const db = connect(this.path);
    try {
      if (!existed) {
        db.exec("BEGIN IMMEDIATE");
        try {
          db.exec(`PRAGMA application_id=${APP_ID}`);
          for (const sql of migrations) db.exec(sql);
          db.exec(`PRAGMA user_version=${VERSION}`);
          validateDatabase(db);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      } else {
        validateDatabase(db);
        if (version(db) < VERSION) {
          snapshot(db, this.safetyPath("upgrade"));
          migrate(db);
        }
      }
      this.db = db;
    } catch (error) {
      db.close();
      throw error;
    }
  }
  close(): void {
    this.db.close();
  }
  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  safetyPath(reason: string): string {
    const dir = join(dirname(this.path), "safety");
    mkdirSync(dir, { recursive: true });
    return join(dir, `${reason}-${Date.now()}-${randomUUID()}.sqlite`);
  }
  backup(destination: string): void {
    if (resolve(destination) === resolve(this.path))
      throw new Error("备份不能覆盖当前数据库");
    snapshot(this.db, destination);
  }
  restore(source: string): string {
    if (resolve(source) === resolve(this.path))
      throw new Error("不能从正在使用的数据库恢复");
    const candidate = connect(source, true);
    const staging = join(dirname(this.path), `restore-${randomUUID()}.sqlite`);
    let safety: string;
    try {
      validateDatabase(candidate);
      safety = this.safetyPath("restore");
      snapshot(this.db, safety);
      snapshot(candidate, staging);
    } finally {
      candidate.close();
    }
    try {
      const prepared = connect(staging);
      try {
        if (version(prepared) < VERSION) migrate(prepared);
        validateDatabase(prepared);
      } finally {
        prepared.close();
      }
      // 同卷原子替换前关闭 canonical；中断只能留下旧库或已验证的新库。
      this.close();
      try {
        renameSync(staging, this.path);
        this.open();
      } catch (error) {
        // 替换或重开失败时恢复安全快照；若补偿也失败，抛出致命错误，宿主必须停止。
        try {
          rmSync(staging, { force: true });
          const backup = connect(safety, true);
          try {
            snapshot(backup, staging);
          } finally {
            backup.close();
          }
          renameSync(staging, this.path);
          this.open();
        } catch (recoveryError) {
          throw new AggregateError(
            [error, recoveryError],
            "恢复失败且无法重新打开安全快照，请退出并保留 safety 目录",
          );
        }
        throw new Error("恢复失败，已重新打开恢复前安全快照", { cause: error });
      }
      return safety;
    } finally {
      rmSync(staging, { force: true });
    }
  }
}
export function snapshot(db: DatabaseSync, destination: string): void {
  if (existsSync(destination))
    throw new Error("目标文件已存在，请使用新的备份文件名");
  db.prepare("VACUUM INTO ?").run(destination);
  const copy = connect(destination, true);
  try {
    validateDatabase(copy);
  } finally {
    copy.close();
  }
}
/** 所有待执行步骤共用事务；版本与 DDL 一起提交，任何一步失败均保留旧版。 */
export function migrate(db: DatabaseSync, steps = migrations): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    for (let i = version(db); i < VERSION; i++) {
      db.exec(steps[i]);
      db.exec(`PRAGMA user_version=${i + 1}`);
    }
    validateDatabase(db);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw new Error("数据库升级失败，已回滚", { cause: error });
  }
}
