import { randomUUID } from "node:crypto";
import { Store } from "../L1_器件层/数据库连接器";
import {
  validateSeries,
  validateOriginalKey,
  validateReminder,
  validateMemo,
  validateUnscheduled,
  type SeriesDraft,
  type ReminderDraft,
  type MemoDraft,
  type UnscheduledDraft,
  type Reminder,
  type Memo,
  type Unscheduled,
  dateOnly,
  validateTrack,
  validateItem,
  validateVector,
  type Track,
  type TrackDraft,
  type Item,
  type ItemDraft,
  type Vector,
  type VectorDraft,
  type StateView,
  type TodaySource,
} from "../L0_公理层/状态契约";

import { readSeries, readExceptions } from "../L1_器件层/数据库结构";
import { expandOccurrences } from "../L1_器件层/循环展开器";

export class PersonalState {
  constructor(private readonly store: Store) {}
  view(date: string): StateView {
    dateOnly(date);
    const db = this.store.db;
    const tracks = db
      .prepare("SELECT * FROM tracks ORDER BY updatedAt DESC, id")
      .all() as unknown as Track[];
    const items = db
      .prepare("SELECT * FROM items ORDER BY date, startTime, id")
      .all() as unknown as Item[];
    const vectors = db
      .prepare("SELECT * FROM vectors ORDER BY startDate, id")
      .all() as unknown as Vector[];
    const series = readSeries(db),
      exceptions = readExceptions(db);
    const reminders = db
      .prepare("SELECT * FROM reminders ORDER BY date,id")
      .all() as unknown as Reminder[];
    const memos = db
      .prepare("SELECT * FROM memos ORDER BY date,id")
      .all() as unknown as Memo[];
    const unscheduled = db
      .prepare("SELECT * FROM unscheduled ORDER BY id")
      .all() as unknown as Unscheduled[];
    const ack = new Set(
      db
        .prepare(
          "SELECT sourceId FROM acknowledgements WHERE date=? AND acknowledged=1",
        )
        .all(date)
        .map((r) => String(r.sourceId)),
    );
    const today: TodaySource[] = [
      ...vectors
        .filter((v) => v.startDate <= date && date <= v.endDate)
        .map((v) => ({
          id: v.id,
          kind: "vector" as const,
          title: v.content,
          detail: `${v.startDate} — ${v.endDate}`,
        })),
      ...items
        .filter((i) => i.date === date)
        .map((i) => ({
          id: i.id,
          kind: "item" as const,
          title: i.title,
          detail: `${i.startTime} — ${i.endTime}${i.trackId ? ` · ${tracks.find((t) => t.id === i.trackId)!.name}` : ""}`,
          acknowledged: ack.has(`item:${i.id}`),
        })),
    ];
    for (const o of expandOccurrences(series, exceptions, date, date))
      today.push({
        id: o.id,
        kind: "occurrence",
        title: o.title,
        detail: `${o.startTime} — ${o.endTime} · 循环${o.trackId ? ` · ${tracks.find((t) => t.id === o.trackId)!.name}` : ""}`,
        acknowledged: ack.has(`occurrence:${o.id}`),
      });
    for (const r of reminders.filter((r) => r.date === date))
      today.push({
        id: r.id,
        kind: "reminder",
        title: r.content,
        detail: r.time ?? "今天",
      });
    for (const m of memos.filter((m) => m.date === date))
      today.push({ id: m.id, kind: "memo", title: m.content, detail: m.date });
    return {
      tracks,
      items,
      vectors,
      series,
      exceptions,
      reminders,
      memos,
      unscheduled,
      today,
      localDate: date,
    };
  }
  saveTrack(id: string | null, draft: TrackDraft): string {
    validateTrack(draft);
    return this.store.transaction(() => {
      const key = id ?? randomUUID();
      const args = [
        draft.name,
        draft.goal,
        draft.phase,
        draft.realState,
        draft.direction,
        draft.status,
        new Date().toISOString(),
        key,
      ];
      if (id)
        this.requireChange(
          this.store.db
            .prepare(
              "UPDATE tracks SET name=?,goal=?,phase=?,realState=?,direction=?,status=?,updatedAt=? WHERE id=?",
            )
            .run(...args).changes,
        );
      else
        this.store.db
          .prepare(
            "INSERT INTO tracks(name,goal,phase,realState,direction,status,updatedAt,id) VALUES(?,?,?,?,?,?,?,?)",
          )
          .run(...args);
      return key;
    });
  }
  saveItem(id: string | null, draft: ItemDraft): string {
    validateItem(draft);
    return this.store.transaction(() => {
      if (
        draft.trackId &&
        !this.store.db
          .prepare("SELECT id FROM tracks WHERE id=?")
          .get(draft.trackId)
      )
        throw new Error("关联的 Track 不存在");
      const key = id ?? randomUUID();
      const args = [
        draft.title,
        draft.date,
        draft.startTime,
        draft.endTime,
        draft.trackId,
        key,
      ];
      if (id)
        this.requireChange(
          this.store.db
            .prepare(
              "UPDATE items SET title=?,date=?,startTime=?,endTime=?,trackId=? WHERE id=?",
            )
            .run(...args).changes,
        );
      else
        this.store.db
          .prepare(
            "INSERT INTO items(title,date,startTime,endTime,trackId,id) VALUES(?,?,?,?,?,?)",
          )
          .run(...args);
      return key;
    });
  }
  saveVector(id: string | null, draft: VectorDraft): string {
    validateVector(draft);
    return this.store.transaction(() => {
      if (
        this.store.db
          .prepare(
            "SELECT id FROM vectors WHERE startDate <= ? AND endDate >= ? AND id != ?",
          )
          .get(draft.endDate, draft.startDate, id ?? "")
      )
        throw new Error("日期与已有 Current Vector 重叠，请调整日期");
      const key = id ?? randomUUID();
      const args = [draft.content, draft.startDate, draft.endDate, key];
      if (id)
        this.requireChange(
          this.store.db
            .prepare(
              "UPDATE vectors SET content=?,startDate=?,endDate=? WHERE id=?",
            )
            .run(...args).changes,
        );
      else
        this.store.db
          .prepare(
            "INSERT INTO vectors(content,startDate,endDate,id) VALUES(?,?,?,?)",
          )
          .run(...args);
      return key;
    });
  }
  /** 原子删除一个日期内的单次日程；null 表示清空该日，混入其它日期/失效 ID 时整批拒绝。 */
  deleteItems(date: string, ids: string[] | null): void {
    dateOnly(date);
    if (
      ids !== null &&
      (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id))
    )
      throw new Error("日程选择无效");
    this.store.transaction(() => {
      const dayIds = this.store.db
        .prepare("SELECT id FROM items WHERE date=?")
        .all(date)
        .map((row) => String(row.id));
      const chosen = ids === null ? dayIds : [...new Set(ids)];
      if (chosen.some((id) => !dayIds.includes(id)))
        throw new Error("选择中存在非当天或已变更的日程，请重新选择");
      const remove = this.store.db.prepare(
        "DELETE FROM items WHERE id=? AND date=?",
      );
      const removeAck = this.store.db.prepare(
        "DELETE FROM acknowledgements WHERE sourceId=?",
      );
      for (const id of chosen) {
        remove.run(id, date);
        removeAck.run(`item:${id}`);
      }
    });
  }
  acknowledge(date: string, sourceId: string, acknowledged: boolean): void {
    dateOnly(date);
    if (typeof acknowledged !== "boolean") throw new Error("确认值无效");
    this.store.transaction(() => {
      if (
        !this.view(date).today.some(
          (s) =>
            (s.kind === "item" || s.kind === "occurrence") &&
            `${s.kind}:${s.id}` === sourceId,
        )
      )
        throw new Error("此来源不属于当前日期，请刷新 Today");
      this.store.db
        .prepare(
          "INSERT INTO acknowledgements(date,sourceId,acknowledged) VALUES(?,?,?) ON CONFLICT(date,sourceId) DO UPDATE SET acknowledged=excluded.acknowledged",
        )
        .run(date, sourceId, Number(acknowledged));
    });
  }
  /** 整循环编辑有例外时必须显式确认；更新与清空同事务，拒绝时不写入任何事实。 */
  saveSeries(
    id: string | null,
    draft: SeriesDraft,
    clearExceptions = false,
  ): string {
    validateSeries(draft);
    return this.store.transaction(() => {
      const db = this.store.db,
        key = id ?? randomUUID();
      if (
        id &&
        db.prepare("SELECT 1 FROM exceptions WHERE seriesId=?").get(id) &&
        clearExceptions !== true
      )
        throw new Error("现有单次例外将被清除，请确认后保存整个循环");
      const args = [
        draft.title,
        draft.startDate,
        draft.endDate,
        draft.startTime,
        draft.endTime,
        draft.pattern,
        JSON.stringify(draft.weekdays),
        draft.trackId,
        key,
      ];
      if (id) {
        this.requireChange(
          db
            .prepare(
              "UPDATE series SET title=?,startDate=?,endDate=?,startTime=?,endTime=?,pattern=?,weekdays=?,trackId=? WHERE id=?",
            )
            .run(...args).changes,
        );
        db.prepare("DELETE FROM exceptions WHERE seriesId=?").run(id);
        this.clearSeriesAck(id);
      } else
        db.prepare(
          "INSERT INTO series(title,startDate,endDate,startTime,endTime,pattern,weekdays,trackId,id) VALUES(?,?,?,?,?,?,?,?,?)",
        ).run(...args);
      return key;
    });
  }
  /** null 表示仅删除这一次；value 是展示值，originalKey 永不随移动改变。 */
  saveException(
    seriesId: string,
    originalKey: string,
    value: ItemDraft | null,
  ): void {
    if (value !== null) validateItem(value);
    this.store.transaction(() => {
      const series = readSeries(this.store.db).find((s) => s.id === seriesId);
      if (!series) throw new Error("循环不存在，请刷新");
      validateOriginalKey(series, originalKey);
      // 删除边界终止该 occurrence 的视觉确认；旧快照的 tombstone 重编辑也须清理历史残留。
      // 与下方例外写入同事务，失败时一起回滚；普通未删除编辑保持原确认语义。
      if (
        value === null ||
        this.store.db
          .prepare(
            "SELECT 1 FROM exceptions WHERE seriesId=? AND originalKey=? AND deleted=1",
          )
          .get(seriesId, originalKey)
      )
        this.store.db
          .prepare("DELETE FROM acknowledgements WHERE sourceId=?")
          .run(`occurrence:${seriesId}@${originalKey}`);
      this.store.db
        .prepare(
          "INSERT INTO exceptions(seriesId,originalKey,deleted,title,date,startTime,endTime,trackId) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(seriesId,originalKey) DO UPDATE SET deleted=excluded.deleted,title=excluded.title,date=excluded.date,startTime=excluded.startTime,endTime=excluded.endTime,trackId=excluded.trackId",
        )
        .run(
          seriesId,
          originalKey,
          value === null ? 1 : 0,
          value?.title ?? null,
          value?.date ?? null,
          value?.startTime ?? null,
          value?.endTime ?? null,
          value?.trackId ?? null,
        );
    });
  }
  deleteSeries(id: string): void {
    this.store.transaction(() => {
      this.requireChange(
        this.store.db.prepare("DELETE FROM series WHERE id=?").run(id).changes,
      );
      this.clearSeriesAck(id);
    });
  }
  private clearSeriesAck(id: string): void {
    // 移除固定长度 @YYYY-MM-DDTHH:mm 后精确匹配 Series ID，避免前缀相似 ID 串删。
    const source = `occurrence:${id}`;
    this.store.db
      .prepare(
        "DELETE FROM acknowledgements WHERE substr(sourceId,1,length(sourceId)-17)=?",
      )
      .run(source);
  }
  saveReminder(id: string | null, d: ReminderDraft): string {
    validateReminder(d);
    return this.store.transaction(() => {
      const key = id ?? randomUUID();
      const args = [d.content, d.date, d.time, key];
      if (id)
        this.requireChange(
          this.store.db
            .prepare("UPDATE reminders SET content=?,date=?,time=? WHERE id=?")
            .run(...args).changes,
        );
      else
        this.store.db
          .prepare(
            "INSERT INTO reminders(content,date,time,id) VALUES(?,?,?,?)",
          )
          .run(...args);
      return key;
    });
  }
  saveMemo(id: string | null, d: MemoDraft): string {
    validateMemo(d);
    return this.store.transaction(() => {
      const key = id ?? randomUUID();
      const args = [d.content, d.date, key];
      if (id)
        this.requireChange(
          this.store.db
            .prepare("UPDATE memos SET content=?,date=? WHERE id=?")
            .run(...args).changes,
        );
      else
        this.store.db
          .prepare("INSERT INTO memos(content,date,id) VALUES(?,?,?)")
          .run(...args);
      return key;
    });
  }
  saveUnscheduled(id: string | null, d: UnscheduledDraft): string {
    validateUnscheduled(d);
    return this.store.transaction(() => {
      const key = id ?? randomUUID();
      const args = [d.content, d.trackId, key];
      if (id)
        this.requireChange(
          this.store.db
            .prepare("UPDATE unscheduled SET content=?,trackId=? WHERE id=?")
            .run(...args).changes,
        );
      else
        this.store.db
          .prepare("INSERT INTO unscheduled(content,trackId,id) VALUES(?,?,?)")
          .run(...args);
      return key;
    });
  }
  /** 仅限三个明确的信息对象，不接受动态表名或通用实体扩展。 */
  deleteInformation(
    kind: "reminder" | "memo" | "unscheduled",
    id: string,
  ): void {
    const sql = {
      reminder: "DELETE FROM reminders WHERE id=?",
      memo: "DELETE FROM memos WHERE id=?",
      unscheduled: "DELETE FROM unscheduled WHERE id=?",
    }[kind];
    if (!sql) throw new Error("信息类型无效");
    this.store.transaction(() =>
      this.requireChange(this.store.db.prepare(sql).run(id).changes),
    );
  }
  private requireChange(changes: number | bigint): void {
    if (Number(changes) !== 1) throw new Error("记录不存在，请刷新");
  }
}
