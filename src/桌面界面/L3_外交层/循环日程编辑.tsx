import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  StateView,
  Occurrence,
  Series,
} from "../../个人状态/L3_外交层/状态公开接口";
import "./桌面公开契约";
export type RecurrenceEditor = {
  date: string;
  occurrence?: Occurrence;
  series?: Series;
  action: "edit" | "delete";
};
/** occurrence 操作先选范围；整循环的例外清除确认在提交前可见，取消不发送命令。 */
export function RecurrenceDialog({
  editor,
  state,
  onClose,
  onSaved,
}: {
  editor: RecurrenceEditor;
  state: StateView;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [scope, setScope] = useState<"one" | "all" | undefined>(
    editor.occurrence ? undefined : "all",
  );
  const series =
    editor.series ??
    state.series.find((s) => s.id === editor.occurrence?.seriesId);
  const value = scope === "one" ? editor.occurrence : series;
  const [pattern, setPattern] = useState(series?.pattern ?? "daily");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const hasExceptions =
    scope === "all" &&
    !!series &&
    state.exceptions.some((e) => e.seriesId === series.id);
  useEffect(() => {
    ref.current!.showModal();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget),
      get = (key: string) => String(data.get(key) ?? "");
    try {
      if (editor.action === "delete") {
        if (scope === "one")
          await window.workbench.saveException(
            editor.occurrence!.seriesId,
            editor.occurrence!.originalKey,
            null,
          );
        else await window.workbench.deleteSeries(series!.id);
      } else if (scope === "one")
        await window.workbench.saveException(
          editor.occurrence!.seriesId,
          editor.occurrence!.originalKey,
          {
            title: get("title"),
            date: get("date"),
            startTime: get("startTime"),
            endTime: get("endTime"),
            trackId: get("trackId") || null,
          },
        );
      else
        await window.workbench.saveSeries(
          series?.id ?? null,
          {
            title: get("title"),
            startDate: get("startDate"),
            endDate: get("endDate") || null,
            startTime: get("startTime"),
            endTime: get("endTime"),
            pattern,
            weekdays:
              pattern === "weekly" ? data.getAll("weekdays").map(Number) : [],
            trackId: get("trackId") || null,
          },
          data.get("clear") === "on",
        );
      await onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const field = (
    label: string,
    name: string,
    value: string,
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      <input name={name} defaultValue={value} type={type} required={required} />
    </label>
  );
  return (
    <dialog
      ref={ref}
      aria-labelledby="recurrence-heading"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <h2 id="recurrence-heading">
        {editor.action === "delete"
          ? "删除循环日程"
          : series
            ? "编辑循环日程"
            : "新建循环日程"}
      </h2>
      {!scope ? (
        <>
          <p>
            请选择本次{editor.action === "delete" ? "删除" : "编辑"}的范围。
          </p>
          <div className="toolbar">
            <button onClick={() => setScope("one")}>仅这一次</button>
            <button onClick={() => setScope("all")}>整个循环</button>
          </div>
          <footer>
            <button onClick={onClose}>取消</button>
          </footer>
        </>
      ) : (
        <form key={scope} onSubmit={(e) => void submit(e)}>
          <p className="muted">
            {scope === "one" ? "仅这一次" : "整个循环"}
            {editor.occurrence ? ` · ${editor.occurrence.title}` : ""}
          </p>
          <fieldset disabled={busy}>
            {editor.action === "delete" ? (
              <p className="delete-confirmation">
                {scope === "one"
                  ? "确认删除这一次日程？其它 occurrence 保留。"
                  : "确认删除整个循环及其单次例外？其它日程不受影响。"}
              </p>
            ) : (
              <>
                {field("循环标题", "title", value?.title ?? "")}
                {scope === "one" ? (
                  field("日期", "date", editor.occurrence!.date, "date")
                ) : (
                  <div className="pair">
                    {field(
                      "开始日期",
                      "startDate",
                      series?.startDate ?? editor.date,
                      "date",
                    )}
                    {field(
                      "结束日期（可选）",
                      "endDate",
                      series?.endDate ?? "",
                      "date",
                      false,
                    )}
                  </div>
                )}
                <div className="pair">
                  {field(
                    "开始时间",
                    "startTime",
                    value?.startTime ?? "09:00",
                    "time",
                  )}
                  {field(
                    "结束时间",
                    "endTime",
                    value?.endTime ?? "10:00",
                    "time",
                  )}
                </div>
                {scope === "all" && (
                  <>
                    <label>
                      重复模式
                      <select
                        value={pattern}
                        onChange={(e) =>
                          setPattern(e.target.value as "daily" | "weekly")
                        }
                      >
                        <option value="daily">每天</option>
                        <option value="weekly">每周指定星期</option>
                      </select>
                    </label>
                    {pattern === "weekly" && (
                      <div className="weekdays-choice">
                        {[
                          "周一",
                          "周二",
                          "周三",
                          "周四",
                          "周五",
                          "周六",
                          "周日",
                        ].map((day, i) => (
                          <label key={day}>
                            <input
                              name="weekdays"
                              type="checkbox"
                              value={i + 1}
                              defaultChecked={series?.weekdays.includes(i + 1)}
                            />
                            {day}
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <label>
                  关联 Track（可选）
                  <select name="trackId" defaultValue={value?.trackId ?? ""}>
                    <option value="">不关联</option>
                    {state.tracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                {hasExceptions && (
                  <div className="delete-confirmation">
                    <p>
                      继续保存整个循环将清除现有单次修改和删除例外，不会自动映射到新规则。
                    </p>
                    <label className="inline-check">
                      <input type="checkbox" name="clear" required />
                      我确认清除现有单次例外
                    </label>
                  </div>
                )}
              </>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer>
            <button type="button" disabled={busy} onClick={onClose}>
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              className={editor.action === "delete" ? "danger" : "primary"}
            >
              {editor.action === "delete" ? "确认删除循环" : "保存循环"}
            </button>
          </footer>
        </form>
      )}
    </dialog>
  );
}
