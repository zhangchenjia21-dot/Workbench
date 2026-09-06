import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  StateView,
  Reminder,
  Memo,
  Unscheduled,
} from "../../个人状态/L3_外交层/状态公开接口";
import "./桌面公开契约";
type InformationEditor =
  | { kind: "reminder"; value?: Reminder }
  | { kind: "memo"; value?: Memo }
  | { kind: "unscheduled"; value?: Unscheduled };
const labels = {
  reminder: "Reminder",
  memo: "Memo",
  unscheduled: "Unscheduled",
};
/** 三个独立的 Plan 信息语义；只有表单生命周期复用，没有通用事件转换。 */
export function PlanInformation({
  state,
  onChanged,
}: {
  state: StateView;
  onChanged: () => Promise<void>;
}) {
  const [editor, setEditor] = useState<InformationEditor>();
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="plan-information">
      {(["reminder", "memo", "unscheduled"] as const).map((kind) => {
        const entries =
          kind === "reminder"
            ? state.reminders
            : kind === "memo"
              ? state.memos
              : state.unscheduled;
        return (
          <section key={kind} aria-label={`Plan ${labels[kind]}`}>
            <div className="section-heading">
              <h2>{labels[kind]}</h2>
              <button
                onClick={() => {
                  setDeleting(false);
                  setEditor({ kind });
                }}
              >
                新建 {labels[kind]}
              </button>
            </div>
            <p className="muted">
              {
                {
                  reminder: "在指定日期或时间需要注意的信息。",
                  memo: "在某一天再次看到的一段信息。",
                  unscheduled: "近期已决定要做，时间尚未确定；不进入 Today。",
                }[kind]
              }
            </p>
            {entries.length === 0 && (
              <p className="empty">还没有{labels[kind]}。</p>
            )}
            {entries.map((value) => (
              <article className="row" key={value.id}>
                <div>
                  <h3>{value.content}</h3>
                  <p>
                    {"date" in value ? value.date : "时间未定"}
                    {"time" in value && value.time ? ` · ${value.time}` : ""}
                    {"trackId" in value && value.trackId
                      ? ` · ${state.tracks.find((t) => t.id === value.trackId)?.name}`
                      : ""}
                  </p>
                </div>
                <div className="source-actions">
                  <button
                    aria-label={`编辑 ${labels[kind]} ${value.content}`}
                    onClick={() => {
                      setDeleting(false);
                      setEditor({ kind, value } as InformationEditor);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    aria-label={`删除 ${labels[kind]} ${value.content}`}
                    onClick={() => {
                      setDeleting(true);
                      setEditor({ kind, value } as InformationEditor);
                    }}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </section>
        );
      })}
      {editor && (
        <InformationDialog
          editor={editor}
          deleting={deleting}
          state={state}
          onClose={() => setEditor(undefined)}
          onSaved={async () => {
            await onChanged();
            setEditor(undefined);
          }}
        />
      )}
    </div>
  );
}
function InformationDialog({
  editor,
  deleting,
  state,
  onClose,
  onSaved,
}: {
  editor: InformationEditor;
  deleting: boolean;
  state: StateView;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current!.showModal();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget),
      get = (key: string) => String(data.get(key) ?? "");
    try {
      const id = editor.value?.id ?? null;
      if (deleting) await window.workbench.deleteInformation(editor.kind, id!);
      else if (editor.kind === "reminder")
        await window.workbench.saveReminder(id, {
          content: get("content"),
          date: get("date"),
          time: get("time") || null,
        });
      else if (editor.kind === "memo")
        await window.workbench.saveMemo(id, {
          content: get("content"),
          date: get("date"),
        });
      else
        await window.workbench.saveUnscheduled(id, {
          content: get("content"),
          trackId: get("trackId") || null,
        });
      await onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      aria-labelledby="information-heading"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={(e) => void submit(e)}>
        <h2 id="information-heading">
          {deleting ? "删除" : editor.value ? "编辑" : "新建"}{" "}
          {labels[editor.kind]}
        </h2>
        <fieldset disabled={busy}>
          {deleting ? (
            <p>确认删除「{editor.value!.content}」？</p>
          ) : (
            <>
              <label>
                {editor.kind === "reminder"
                  ? "提醒内容"
                  : editor.kind === "memo"
                    ? "备忘内容"
                    : "近期要做的事"}
                <textarea
                  name="content"
                  rows={3}
                  required
                  defaultValue={editor.value?.content}
                />
              </label>
              {editor.kind !== "unscheduled" && (
                <label>
                  {editor.kind === "memo" ? "展示日期" : "提醒日期"}
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={editor.value?.date ?? state.localDate}
                  />
                </label>
              )}
              {editor.kind === "reminder" && (
                <label>
                  提醒时间（可选）
                  <input
                    type="time"
                    name="time"
                    defaultValue={editor.value?.time ?? ""}
                  />
                </label>
              )}
              {editor.kind === "unscheduled" && (
                <label>
                  关联 Track（可选）
                  <select
                    name="trackId"
                    defaultValue={editor.value?.trackId ?? ""}
                  >
                    <option value="">不关联</option>
                    {state.tracks.map((t) => (
                      <option value={t.id} key={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
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
            className={deleting ? "danger" : "primary"}
            disabled={busy}
          >
            {deleting ? "确认删除信息" : "保存信息"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
