export type TrackStatus = "Active" | "Completed" | "Archived";
export interface TrackDraft {
  name: string;
  goal: string;
  phase: string;
  realState: string;
  direction: string;
  status: TrackStatus;
}
export interface Track extends TrackDraft {
  id: string;
  updatedAt: string;
}
export interface ItemDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  trackId: string | null;
}
export interface Item extends ItemDraft {
  id: string;
}
export interface VectorDraft {
  content: string;
  startDate: string;
  endDate: string;
}
export interface Vector extends VectorDraft {
  id: string;
}
export interface TodaySource {
  id: string;
  kind: "vector" | "item";
  title: string;
  detail: string;
  acknowledged: boolean;
}
export interface StateView {
  tracks: Track[];
  items: Item[];
  vectors: Vector[];
  today: TodaySource[];
  localDate: string;
}

/** 本地日历日期，不经 UTC 午夜转换；系统时间戳不使用此函数。 */
export function localDate(now = new Date()): string {
  return `${now.getFullYear().toString().padStart(4, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
}
export function dateOnly(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("日期格式应为 YYYY-MM-DD");
  const [y, m, d] = value.split("-").map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1])
    throw new Error("日期不存在");
}
export function textField(
  value: unknown,
  label: string,
  required = false,
): asserts value is string {
  if (typeof value !== "string" || (required && !value.trim()))
    throw new Error(`${label}不能为空或格式不正确`);
}
export function validateTrack(d: TrackDraft): void {
  textField(d.name, "名称", true);
  for (const field of ["goal", "phase", "realState", "direction"] as const)
    textField(d[field], field);
  if (!["Active", "Completed", "Archived"].includes(d.status))
    throw new Error("Track 状态无效");
}
export function validateItem(d: ItemDraft): void {
  textField(d.title, "日程标题", true);
  dateOnly(d.date);
  if (
    ![d.startTime, d.endTime].every(
      (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
    ) ||
    d.startTime >= d.endTime
  )
    throw new Error("结束时间必须晚于开始时间（同一天）");
  if (d.trackId !== null) textField(d.trackId, "Track ID", true);
}
export function validateVector(d: VectorDraft): void {
  textField(d.content, "注意力方向", true);
  dateOnly(d.startDate);
  dateOnly(d.endDate);
  if (d.startDate > d.endDate) throw new Error("结束日期不能早于开始日期");
}
/** 两端包含：共用一个日期也构成重叠；相邻日不重叠。 */
export function overlaps(a: VectorDraft, b: VectorDraft): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}
