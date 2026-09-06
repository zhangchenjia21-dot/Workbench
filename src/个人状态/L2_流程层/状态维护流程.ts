import { randomUUID } from "node:crypto";
import { Store } from "../L1_器件层/数据库连接器";
import {
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
    return { tracks, items, vectors, today, localDate: date };
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
          (s) => s.kind === "item" && `item:${s.id}` === sourceId,
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
  private requireChange(changes: number | bigint): void {
    if (Number(changes) !== 1) throw new Error("记录不存在，请刷新");
  }
}
