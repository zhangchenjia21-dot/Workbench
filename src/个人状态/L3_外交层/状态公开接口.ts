import { ProjectUpdates } from "../L2_流程层/项目近况流程";
import { readGitHubProject } from "../L1_器件层/GitHub项目读取器";
export type {
  ProjectSource,
  ProjectUpdate,
  ProjectProposal,
  ProjectSnapshot,
} from "../L0_公理层/项目来源契约";
import { Store } from "../L1_器件层/数据库连接器";
import { PersonalState } from "../L2_流程层/状态维护流程";
import { localDate } from "../L0_公理层/状态契约";
export { expandOccurrences } from "../L1_器件层/循环展开器";
export { addDays, weekday } from "../L0_公理层/状态契约";
export { localDate } from "../L0_公理层/状态契约";
export type {
  SeriesDraft,
  Series,
  Occurrence,
  OccurrenceException,
  ReminderDraft,
  Reminder,
  MemoDraft,
  Memo,
  UnscheduledDraft,
  Unscheduled,
  TrackStatus,
  Track,
  TrackDraft,
  Item,
  ItemDraft,
  Vector,
  VectorDraft,
  StateView,
  TodaySource,
} from "../L0_公理层/状态契约";

/** 创建主进程唯一状态入口；path 为 per-user DB。调用结束必须 close，失败不得继续使用关闭的连接。 */
export function openWorkbench(path: string, readProject = readGitHubProject) {
  const store = new Store(path);
  const state = new PersonalState(store);
  const projects = new ProjectUpdates(store);
  let generation = 0;
  const pending = new Map<string, Promise<void>>();
  function refreshSource(id: string): Promise<void> {
    if (pending.has(id)) return pending.get(id)!;
    const source = projects.view().find((s) => s.id === id);
    if (!source) return Promise.reject(Error("来源已断开"));
    const epoch = generation;
    const task = Promise.resolve().then(async () => {
      try {
        const snapshot = await readProject(source.repository);
        if (epoch !== generation) throw Error("恢复或关闭之后的旧请求已丢弃。");
        projects.capture(id, snapshot);
      } catch (error) {
        if (epoch === generation) projects.failed(id, String(error));
        throw error;
      } finally {
        if (pending.get(id) === task) pending.delete(id);
      }
    });
    pending.set(id, task);
    return task;
  }
  return {
    /** 项目近况是本地保存的外部证据投影；无数据时无需网络，断网不妨碍核心。 */
    projectSources: () => projects.view(),
    connectProject: projects.connect.bind(projects),
    disconnectProject: projects.disconnect.bind(projects),
    seeProjectUpdate: projects.seen.bind(projects),
    proposeProjectUpdate: projects.propose.bind(projects),
    acceptProjectUpdate: projects.accept.bind(projects),
    refreshSource,
    /** 调度只检查超过 30 分钟的来源；单源失败不阻塞其它来源，错误仍保存在各来源。 */
    refreshDueSources: async () => {
      const due = projects
        .view()
        .filter(
          (s) =>
            !s.checkedAt ||
            Date.now() - Date.parse(s.checkedAt) >= 30 * 60 * 1000,
        );
      await Promise.allSettled(due.map((s) => refreshSource(s.id)));
    },
    view: (date = localDate()) => state.view(date),
    /** 所有写入串行事务；失败抛错，renderer 必须保留表单并展示错误。 */
    saveSeries: state.saveSeries.bind(state),
    saveException: state.saveException.bind(state),
    deleteSeries: state.deleteSeries.bind(state),
    saveReminder: state.saveReminder.bind(state),
    saveMemo: state.saveMemo.bind(state),
    saveUnscheduled: state.saveUnscheduled.bind(state),
    deleteInformation: state.deleteInformation.bind(state),
    saveTrack: state.saveTrack.bind(state),
    saveItem: state.saveItem.bind(state),
    saveVector: state.saveVector.bind(state),
    /** ids=null 清空指定日期；否则精确删除当日所选 ID。失败整批回滚，不影响 Track/Vector。 */
    deleteItems: state.deleteItems.bind(state),
    acknowledge: state.acknowledge.bind(state),
    backup: (path: string) => store.backup(path),
    restore: (path: string) => {
      generation++;
      pending.clear();
      return store.restore(path);
    },
    close: () => {
      generation++;
      pending.clear();
      store.close();
    },
  };
}
export type Workbench = ReturnType<typeof openWorkbench>;
