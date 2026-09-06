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
interface TodaySourceBase {
  id: string;
  title: string;
  detail: string;
}
/** Vector / Reminder / Memo 仅为信息；日程与循环 occurrence 才有当天视觉确认。 */
export type TodaySource = TodaySourceBase &
  (
    | { kind: "vector" }
    | { kind: "reminder" }
    | { kind: "memo" }
    | { kind: "item"; acknowledged: boolean }
    | { kind: "occurrence"; acknowledged: boolean }
  );
export interface StateView {
  series: Series[];
  exceptions: OccurrenceException[];
  reminders: Reminder[];
  memos: Memo[];
  unscheduled: Unscheduled[];
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

/** 每日最多一个原始位置；日期/时间字符串是 wall-time，不是 UTC instant。 */
export interface SeriesDraft {
  title: string;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  pattern: "daily" | "weekly";
  weekdays: number[]; // ISO 星期：1=周一，7=周日；daily 使用空数组。
  trackId: string | null;
}
export interface Series extends SeriesDraft {
  id: string;
}
export interface Occurrence extends ItemDraft {
  id: string;
  seriesId: string;
  originalKey: string;
}
export type OccurrenceException = { seriesId: string; originalKey: string } & (
  | { deleted: true }
  | { deleted: false; value: ItemDraft }
);
export interface ReminderDraft {
  content: string;
  date: string;
  time: string | null;
}
export interface Reminder extends ReminderDraft {
  id: string;
}
export interface MemoDraft {
  content: string;
  date: string;
}
export interface Memo extends MemoDraft {
  id: string;
}
export interface UnscheduledDraft {
  content: string;
  trackId: string | null;
}
export interface Unscheduled extends UnscheduledDraft {
  id: string;
}
export function validateSeries(d: SeriesDraft): void {
  validateItem({ ...d, date: d.startDate });
  if (d.endDate !== null) {
    dateOnly(d.endDate);
    if (d.endDate < d.startDate)
      throw new Error("循环结束日期不能早于开始日期");
  }
  if (
    !["daily", "weekly"].includes(d.pattern) ||
    !Array.isArray(d.weekdays) ||
    d.weekdays.some((n) => !Number.isInteger(n) || n < 1 || n > 7) ||
    new Set(d.weekdays).size !== d.weekdays.length ||
    (d.pattern === "weekly" ? d.weekdays.length === 0 : d.weekdays.length !== 0)
  )
    throw new Error("循环星期规则无效");
}
export function validateReminder(d: ReminderDraft): void {
  textField(d.content, "Reminder 内容", true);
  dateOnly(d.date);
  if (
    d.time !== null &&
    (typeof d.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time))
  )
    throw new Error("Reminder 时间无效");
}
export function validateMemo(d: MemoDraft): void {
  textField(d.content, "Memo 内容", true);
  dateOnly(d.date);
}
export function validateUnscheduled(d: UnscheduledDraft): void {
  textField(d.content, "Unscheduled 内容", true);
  if (d.trackId !== null) textField(d.trackId, "Track ID", true);
}
/** 纯 Gregorian 日期运算，无时区、DST 或 UTC 午夜编码。 */
export function addDays(date: string, delta: number): string {
  dateOnly(date);
  let [y, m, d] = date.split("-").map(Number);
  const days = (year: number, month: number) =>
    [
      31,
      year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ][month - 1];
  const direction = Math.sign(delta);
  for (let i = 0; i < Math.abs(delta); i++) {
    d += direction;
    if (d > days(y, m)) {
      d = 1;
      if (++m > 12) {
        m = 1;
        y++;
      }
    }
    if (d < 1) {
      if (--m < 1) {
        m = 12;
        y--;
      }
      d = days(y, m);
    }
  }
  const result = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  dateOnly(result);
  return result;
}
export function weekday(date: string): number {
  dateOnly(date);
  const [, m, d] = date.split("-").map(Number);
  let y = Number(date.slice(0, 4));
  if (m < 3) y--;
  const n =
    (y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) +
      [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4][m - 1] +
      d) %
    7;
  return n || 7;
}
export function occursOn(s: Series, date: string): boolean {
  return (
    date >= s.startDate &&
    (s.endDate === null || date <= s.endDate) &&
    (s.pattern === "daily" || s.weekdays.includes(weekday(date)))
  );
}
/** 原键必须仍属于当前规则；整循环改规则会清空例外，不重映射。 */
export function validateOriginalKey(s: Series, key: string): void {
  if (typeof key !== "string" || key.length !== 16)
    throw new Error("原 occurrence 身份无效");
  const date = key.slice(0, 10);
  dateOnly(date);
  if (key !== `${date}T${s.startTime}` || !occursOn(s, date))
    throw new Error("原 occurrence 已不属于当前循环，请刷新");
}
