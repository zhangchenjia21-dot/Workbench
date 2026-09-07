import type {
  ProjectSource,
  ProjectProposal,
  SeriesDraft,
  ReminderDraft,
  MemoDraft,
  UnscheduledDraft,
  TrackDraft,
  ItemDraft,
  VectorDraft,
  StateView,
} from "../../个人状态/L3_外交层/状态公开接口";
/** preload 白名单 API；返回值为 IPC 副本，业务写入只由主进程确认，不暴露 SQL 或任意路径访问。 */
export interface DesktopAPI {
  /** Windows 管理的账号列表不含 Token；登录由官方 GCM 浏览器流程完成。 */
  githubStatus(): Promise<{ accounts: string[]; error: string | null }>;
  loginGitHub(): Promise<void>;
  /** 只读 GitHub 证据；采用提案须显式确认，冲突/恢复后的陈旧结果拒绝。 */
  projectSources(): Promise<ProjectSource[]>;
  connectProject(repository: string): Promise<string>;
  disconnectProject(id: string): Promise<void>;
  refreshSource(id: string): Promise<void>;
  seeProjectUpdate(id: string): Promise<void>;
  proposeProjectUpdate(
    id: string,
    trackId: string | null,
  ): Promise<ProjectProposal>;
  acceptProjectUpdate(proposal: ProjectProposal): Promise<string>;
  openGitHub(url: string): Promise<void>;
  /** 循环有既存例外时须显式确认清除；失败保持全部事实不变。 */
  saveSeries(
    id: string | null,
    draft: SeriesDraft,
    clearExceptions: boolean,
  ): Promise<void>;
  saveException(
    seriesId: string,
    originalKey: string,
    value: ItemDraft | null,
  ): Promise<void>;
  deleteSeries(id: string): Promise<void>;
  saveReminder(id: string | null, draft: ReminderDraft): Promise<void>;
  saveMemo(id: string | null, draft: MemoDraft): Promise<void>;
  saveUnscheduled(id: string | null, draft: UnscheduledDraft): Promise<void>;
  deleteInformation(
    kind: "reminder" | "memo" | "unscheduled",
    id: string,
  ): Promise<void>;
  view(): Promise<StateView>;
  saveTrack(id: string | null, draft: TrackDraft): Promise<void>;
  saveItem(id: string | null, draft: ItemDraft): Promise<void>;
  saveVector(id: string | null, draft: VectorDraft): Promise<void>;
  /** 限定同一日期删除；null 清空该日，界面须先确认。跨日或过期选择拒绝。 */
  deleteItems(date: string, ids: string[] | null): Promise<void>;
  acknowledge(date: string, source: string, flag: boolean): Promise<void>;
  backup(): Promise<string | null>;
  restore(): Promise<string | null>;
}
declare global {
  interface Window {
    workbench: DesktopAPI;
  }
}
