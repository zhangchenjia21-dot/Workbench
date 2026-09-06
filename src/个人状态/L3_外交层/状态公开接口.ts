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
export function openWorkbench(path: string) {
  const store = new Store(path);
  const state = new PersonalState(store);
  return {
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
    restore: (path: string) => store.restore(path),
    close: () => store.close(),
  };
}
export type Workbench = ReturnType<typeof openWorkbench>;
