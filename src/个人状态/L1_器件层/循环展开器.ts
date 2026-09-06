import {
  addDays,
  dateOnly,
  occursOn,
  type Series,
  type OccurrenceException,
  type Occurrence,
} from "../L0_公理层/状态契约";
/** 仅展开请求范围；例外的原位置可以在范围外，因此单独纳入移入项。返回值不可作为第二 canonical store。 */
export function expandOccurrences(
  series: Series[],
  exceptions: OccurrenceException[],
  from: string,
  to: string,
): Occurrence[] {
  dateOnly(from);
  dateOnly(to);
  if (from > to) throw new Error("查询日期范围无效");
  const result: Occurrence[] = [];
  for (const s of series) {
    const overrides = exceptions.filter((e) => e.seriesId === s.id);
    const keys = new Set(overrides.map((e) => e.originalKey));
    const start = from > s.startDate ? from : s.startDate;
    const end = s.endDate && s.endDate < to ? s.endDate : to;
    for (let date = start; date <= end; ) {
      const originalKey = `${date}T${s.startTime}`;
      if (occursOn(s, date) && !keys.has(originalKey))
        result.push({
          id: `${s.id}@${originalKey}`,
          seriesId: s.id,
          originalKey,
          title: s.title,
          date,
          startTime: s.startTime,
          endTime: s.endTime,
          trackId: s.trackId,
        });
      if (date === end) break;
      date = addDays(date, 1);
    }
    for (const e of overrides)
      if (!e.deleted && e.value.date >= from && e.value.date <= to)
        result.push({
          ...e.value,
          id: `${s.id}@${e.originalKey}`,
          seriesId: s.id,
          originalKey: e.originalKey,
        });
  }
  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
}
