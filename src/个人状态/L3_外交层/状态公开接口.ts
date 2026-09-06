import { Store } from "../L1_器件层/数据库连接器";
import { PersonalState } from "../L2_流程层/状态维护流程";
import { localDate } from "../L0_公理层/状态契约";
export { localDate } from "../L0_公理层/状态契约";
export type {
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
    saveTrack: state.saveTrack.bind(state),
    saveItem: state.saveItem.bind(state),
    saveVector: state.saveVector.bind(state),
    acknowledge: state.acknowledge.bind(state),
    backup: (path: string) => store.backup(path),
    restore: (path: string) => store.restore(path),
    close: () => store.close(),
  };
}
export type Workbench = ReturnType<typeof openWorkbench>;
