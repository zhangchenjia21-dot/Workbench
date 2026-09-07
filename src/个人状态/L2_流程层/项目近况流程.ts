import { randomUUID } from "node:crypto";
import { Store } from "../L1_器件层/数据库连接器";
import {
  repositoryName,
  validateProjectSnapshot,
  summarizeProject,
  type ProjectSource,
  type ProjectUpdate,
  type ProjectSnapshot,
  type ProjectProposal,
} from "../L0_公理层/项目来源契约";
import { validateTrack, type Track } from "../L0_公理层/状态契约";

/** 来源快照是证据；只有 accept 的显式确认事务才可改变 Track。 */
export class ProjectUpdates {
  constructor(private readonly store: Store) {}
  view(): ProjectSource[] {
    return this.store.db
      .prepare("SELECT * FROM project_sources ORDER BY repository")
      .all()
      .map((r) => ({
        ...r,
        latest: this.latest(String(r.id)),
      })) as unknown as ProjectSource[];
  }
  private latest(sourceId: string): ProjectUpdate | null {
    const r = this.store.db
      .prepare(
        "SELECT * FROM project_updates WHERE sourceId=? ORDER BY sequence DESC LIMIT 1",
      )
      .get(sourceId);
    return r
      ? {
          id: String(r.id),
          sourceId: String(r.sourceId),
          fetchedAt: String(r.fetchedAt),
          snapshot: JSON.parse(String(r.payload)),
          disposition: r.disposition as ProjectUpdate["disposition"],
        }
      : null;
  }
  connect(input: string): string {
    const repository = repositoryName(input);
    return this.store.transaction(() => {
      if (this.view().some((s) => s.repository === repository))
        throw Error("这个仓库已经连接。");
      if (this.view().length >= 3) throw Error("当前最多连接 3 个公开仓库。");
      const id = randomUUID();
      this.store.db
        .prepare("INSERT INTO project_sources VALUES(?,?,NULL,NULL,NULL)")
        .run(id, repository);
      return id;
    });
  }
  disconnect(id: string): void {
    this.store.transaction(() => {
      if (
        !this.store.db.prepare("DELETE FROM project_sources WHERE id=?").run(id)
          .changes
      )
        throw Error("来源不存在");
    });
  }
  /** 一次拉取成功才整体入库；相同 payload 只刷新检查时间，不制造新提醒。 */
  capture(id: string, snapshot: ProjectSnapshot): void {
    validateProjectSnapshot(snapshot);
    this.store.transaction(() => {
      const source = this.view().find((s) => s.id === id);
      if (!source) throw Error("来源已断开，本次结果未保存。");
      if (
        source.repository !== snapshot.repository ||
        (source.latest &&
          source.latest.snapshot.repositoryId !== snapshot.repositoryId)
      )
        throw Error("仓库身份已变化，请核实后重新连接。");
      const payload = JSON.stringify(snapshot),
        now = new Date().toISOString();
      if (
        !source.latest ||
        JSON.stringify(source.latest.snapshot) !== payload
      ) {
        this.store.db
          .prepare(
            "INSERT INTO project_updates(id,sourceId,fetchedAt,payload,disposition) VALUES(?,?,?,?,'new')",
          )
          .run(randomUUID(), id, now, payload);
        this.store.db
          .prepare(
            "DELETE FROM project_updates WHERE sourceId=? AND sequence NOT IN (SELECT sequence FROM project_updates WHERE sourceId=? ORDER BY sequence DESC LIMIT 20)",
          )
          .run(id, id);
      }
      this.store.db
        .prepare("UPDATE project_sources SET checkedAt=?,error=NULL WHERE id=?")
        .run(now, id);
    });
  }
  failed(id: string, error: string): void {
    this.store.transaction(() =>
      this.store.db
        .prepare("UPDATE project_sources SET checkedAt=?,error=? WHERE id=?")
        .run(new Date().toISOString(), error.slice(0, 1000), id),
    );
  }
  seen(updateId: string): void {
    this.store.transaction(() => {
      if (
        !this.store.db
          .prepare(
            "UPDATE project_updates SET disposition='seen' WHERE id=? AND disposition='new'",
          )
          .run(updateId).changes
      )
        throw Error("这条近况已处理，请刷新。");
    });
  }
  private current(updateId: string): {
    source: ProjectSource;
    update: ProjectUpdate;
  } {
    const source = this.view().find((s) => s.latest?.id === updateId);
    if (!source?.latest) throw Error("来源已有新近况或已断开，请重新查看。");
    if (source.error) throw Error("来源读取失败，请刷新成功后再采用建议。");
    if (source.latest.disposition === "applied")
      throw Error("这条近况已经采用。");
    return { source, update: source.latest };
  }
  /** 提案保存 Track 的完整对照值，确认时检测人工编辑冲突；不按标题猜测关联。 */
  propose(updateId: string, trackId: string | null): ProjectProposal {
    const { source, update } = this.current(updateId);
    const track = trackId
      ? (this.store.db
          .prepare("SELECT * FROM tracks WHERE id=?")
          .get(trackId) as unknown as Track)
      : null;
    if (trackId && !track) throw Error("Track 已不存在。");
    const summary = summarizeProject(update.snapshot);
    return {
      updateId,
      sourceId: source.id,
      expectedTrack: track,
      name: track?.name ?? source.repository.split("/")[1],
      realState: summary.realState,
      direction:
        track &&
        !summary.attention &&
        !update.snapshot.checks.some((c) => c.status !== "completed")
          ? track.direction
          : summary.direction,
    };
  }
  /** 明确确认后原子更新 Track + 来源关联 + 采用状态；外部输入从不修改目标/阶段/lifecycle。 */
  accept(proposal: ProjectProposal): string {
    return this.store.transaction(() => {
      const { source } = this.current(proposal.updateId);
      if (source.id !== proposal.sourceId) throw Error("提案来源不匹配。");
      const expected = proposal.expectedTrack;
      const current = expected
        ? (this.store.db
            .prepare("SELECT * FROM tracks WHERE id=?")
            .get(expected.id) as unknown as Track)
        : null;
      if (
        expected &&
        (!current ||
          (
            [
              "id",
              "name",
              "goal",
              "phase",
              "realState",
              "direction",
              "status",
              "updatedAt",
            ] as const
          ).some((k) => current[k] !== expected[k]))
      )
        throw Error("Track 已被修改，请重新打开建议，避免覆盖你的编辑。");
      const draft = current
        ? {
            ...current,
            realState: proposal.realState,
            direction: proposal.direction,
          }
        : {
            name: proposal.name,
            goal: "",
            phase: "",
            realState: proposal.realState,
            direction: proposal.direction,
            status: "Active" as const,
          };
      validateTrack(draft);
      const id = current?.id ?? randomUUID(),
        now = new Date().toISOString();
      if (current)
        this.store.db
          .prepare(
            "UPDATE tracks SET realState=?,direction=?,updatedAt=? WHERE id=?",
          )
          .run(draft.realState, draft.direction, now, id);
      else
        this.store.db
          .prepare("INSERT INTO tracks VALUES(?,?,?,?,?,?,?,?)")
          .run(
            id,
            draft.name,
            draft.goal,
            draft.phase,
            draft.realState,
            draft.direction,
            draft.status,
            now,
          );
      this.store.db
        .prepare("UPDATE project_sources SET trackId=? WHERE id=?")
        .run(id, source.id);
      this.store.db
        .prepare("UPDATE project_updates SET disposition='applied' WHERE id=?")
        .run(proposal.updateId);
      return id;
    });
  }
}
