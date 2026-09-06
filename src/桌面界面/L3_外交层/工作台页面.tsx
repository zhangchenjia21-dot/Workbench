import { useEffect, useState, useRef, type FormEvent } from "react";
import type {
  StateView,
  Track,
  Item,
  Vector,
  TrackStatus,
} from "../../个人状态/L3_外交层/状态公开接口";
import "./桌面公开契约";
type Page = "Today" | "Plan" | "Tracks";
type Editor =
  | { kind: "track"; value?: Track }
  | { kind: "item"; value?: Item; date: string }
  | { kind: "vector"; value?: Vector };
const statuses: Record<TrackStatus, string> = {
  Active: "进行中",
  Completed: "已完成",
  Archived: "已归档",
};

/** 界面只保存选择与未提交表单；每次写入后重新读取 canonical state，绝不乐观复制业务事实。 */
export function WorkbenchView() {
  const [state, setState] = useState<StateView>();
  const [page, setPage] = useState<Page>("Today");
  const [month, setMonth] = useState("");
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<TrackStatus>("Active");
  const [editor, setEditor] = useState<Editor>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    const result = await window.workbench.view();
    setState(result);
    setMonth((m) => m || result.localDate.slice(0, 7));
    setSelected((d) => d || result.localDate);
  };
  useEffect(() => {
    const update = () => {
      void refresh().catch((e) => setError(String(e)));
    };
    update();
    window.addEventListener("focus", update);
    const timer = window.setInterval(update, 30000);
    return () => {
      window.removeEventListener("focus", update);
      window.clearInterval(timer);
    };
  }, []);
  async function recovery(kind: "backup" | "restore") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const path = await window.workbench[kind]();
      if (path) {
        await refresh();
        setNotice(
          kind === "backup"
            ? `备份已保存：${path}`
            : `已恢复。恢复前安全备份：${path}`,
        );
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  function moveMonth(delta: number) {
    const [year, mon] = month.split("-").map(Number);
    const date = new Date(2000, mon - 1 + delta, 1);
    date.setFullYear(year + Math.floor((mon - 1 + delta) / 12));
    const next = `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
    setMonth(next);
    setSelected(`${next}-01`);
  }
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          W<span>WORKBENCH</span>
        </div>
        <p className="muted">个人工作台</p>
        <nav aria-label="主导航">
          {(["Today", "Plan", "Tracks"] as const).map((p) => (
            <button
              key={p}
              aria-current={p === page ? "page" : undefined}
              onClick={() => {
                setPage(p);
                setNotice("");
              }}
            >
              {p}
              <small>
                {{ Today: "今日信息", Plan: "未来安排", Tracks: "长期状态" }[p]}
              </small>
            </button>
          ))}
        </nav>
        <div className="storage">
          <p>数据保存在本机</p>
          <button disabled={busy} onClick={() => void recovery("backup")}>
            备份数据
          </button>
          <button disabled={busy} onClick={() => void recovery("restore")}>
            从备份恢复
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">{state?.localDate ?? "正在读取"}</p>
            <h1>{page}</h1>
          </div>
          <p className="muted">
            {
              {
                Today: "看清今天，专注眼前。",
                Plan: "为未来留出清楚的位置。",
                Tracks: "长期在推进什么，现在到了哪里。",
              }[page]
            }
          </p>
        </header>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {!state ? (
          <p>正在读取本地数据…</p>
        ) : (
          <>
            {page === "Today" && (
              <>
                <section>
                  <div className="section-heading">
                    <h2>当前注意力 · Current Vector</h2>
                    <button
                      onClick={() => {
                        setPage("Plan");
                        setEditor({
                          kind: "vector",
                          value: state.vectors.find(
                            (v) =>
                              v.startDate <= state.localDate &&
                              v.endDate >= state.localDate,
                          ),
                        });
                      }}
                    >
                      调整方向
                    </button>
                  </div>
                  {!state.today.some((s) => s.kind === "vector") && (
                    <p className="empty">
                      今天没有设定注意力方向。需要时可在 Plan 中添加。
                    </p>
                  )}
                  {state.today
                    .filter((s) => s.kind === "vector")
                    .map((s) => sourceCard(s))}
                </section>
                <section>
                  <div className="section-heading">
                    <h2>今日日程</h2>
                    <button
                      onClick={() =>
                        setEditor({ kind: "item", date: state.localDate })
                      }
                    >
                      添加今日日程
                    </button>
                  </div>
                  {!state.today.some((s) => s.kind === "item") && (
                    <p className="empty">今天没有安排日程。</p>
                  )}
                  {state.today
                    .filter((s) => s.kind === "item")
                    .map((s) => sourceCard(s))}
                </section>
              </>
            )}
            {page === "Tracks" && (
              <>
                <div className="toolbar">
                  <div role="group" aria-label="Track 状态筛选">
                    {(Object.keys(statuses) as TrackStatus[]).map((s) => (
                      <button
                        key={s}
                        aria-pressed={status === s}
                        onClick={() => setStatus(s)}
                      >
                        {statuses[s]}
                      </button>
                    ))}
                  </div>
                  <button
                    className="primary"
                    onClick={() => setEditor({ kind: "track" })}
                  >
                    新建 Track
                  </button>
                </div>
                {!state.tracks.some((t) => t.status === status) && (
                  <p className="empty">
                    这里还没有{statuses[status]}的 Track。
                  </p>
                )}
                <div className="tracks">
                  {state.tracks
                    .filter((t) => t.status === status)
                    .map((t) => (
                      <article key={t.id}>
                        <div className="section-heading">
                          <h2>{t.name}</h2>
                          <button
                            aria-label={`编辑 Track ${t.name}`}
                            onClick={() =>
                              setEditor({ kind: "track", value: t })
                            }
                          >
                            编辑
                          </button>
                        </div>
                        <dl>
                          {[
                            ["长期目标", t.goal],
                            ["当前阶段", t.phase],
                            ["当前真实状态", t.realState],
                            ["近期方向", t.direction],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>{value || "尚未填写"}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="muted">
                          {statuses[t.status]} · 更新于{" "}
                          {new Date(t.updatedAt).toLocaleString()}
                        </p>
                      </article>
                    ))}
                </div>
              </>
            )}
            {page === "Plan" && (
              <>
                <div className="toolbar">
                  <div className="month-nav">
                    <button
                      aria-label="上个月"
                      disabled={month === "0001-01"}
                      onClick={() => moveMonth(-1)}
                    >
                      ‹
                    </button>
                    <h2>{month}</h2>
                    <button
                      aria-label="下个月"
                      disabled={month === "9999-12"}
                      onClick={() => moveMonth(1)}
                    >
                      ›
                    </button>
                    <button
                      onClick={() => {
                        setMonth(state.localDate.slice(0, 7));
                        setSelected(state.localDate);
                      }}
                    >
                      本月
                    </button>
                  </div>
                  <button
                    className="primary"
                    onClick={() => setEditor({ kind: "item", date: selected })}
                  >
                    新建日程
                  </button>
                </div>
                <div className="calendar" aria-label="月历">
                  {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                    <div className="weekday" key={d}>
                      {d}
                    </div>
                  ))}
                  {calendarDays(month).map((date, index) =>
                    date ? (
                      <button
                        className={`day ${date === state.localDate ? "today" : ""}`}
                        aria-pressed={date === selected}
                        aria-label={`选择日期 ${date}`}
                        key={date}
                        onClick={() => setSelected(date)}
                      >
                        <b>{Number(date.slice(-2))}</b>
                        {state.items
                          .filter((i) => i.date === date)
                          .map((i) => (
                            <span key={i.id}>
                              {i.startTime} {i.title}
                            </span>
                          ))}
                      </button>
                    ) : (
                      <div key={`blank-${index}`} className="blank" />
                    ),
                  )}
                </div>
                <section>
                  <h2>{selected} 的日程</h2>
                  {state.items
                    .filter((i) => i.date === selected)
                    .map((i) => (
                      <article className="row" key={i.id}>
                        <div>
                          <h3>{i.title}</h3>
                          <p>
                            {i.startTime} — {i.endTime}
                            {i.trackId
                              ? ` · ${state.tracks.find((t) => t.id === i.trackId)?.name}`
                              : ""}
                          </p>
                        </div>
                        <button
                          aria-label={`编辑日程 ${i.title}`}
                          onClick={() =>
                            setEditor({
                              kind: "item",
                              value: i,
                              date: selected,
                            })
                          }
                        >
                          编辑
                        </button>
                      </article>
                    ))}
                  {!state.items.some((i) => i.date === selected) && (
                    <p className="empty">这一天还没有安排。</p>
                  )}
                  <button
                    onClick={() => setEditor({ kind: "item", date: selected })}
                  >
                    为这一天添加日程
                  </button>
                </section>
                <section>
                  <div className="section-heading">
                    <h2>注意力区间 · Current Vector</h2>
                    <button onClick={() => setEditor({ kind: "vector" })}>
                      新建 Vector
                    </button>
                  </div>
                  {state.vectors.map((v) => (
                    <article className="row" key={v.id}>
                      <div>
                        <h3>{v.content}</h3>
                        <p>
                          {v.startDate} — {v.endDate}
                        </p>
                      </div>
                      <button
                        aria-label={`编辑 Vector ${v.content}`}
                        onClick={() => setEditor({ kind: "vector", value: v })}
                      >
                        编辑
                      </button>
                    </article>
                  ))}
                  {!state.vectors.length && (
                    <p className="empty">
                      为一段时间设定一个主要注意力方向。区间不重叠。
                    </p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
      {editor && state && (
        <EditDialog
          editor={editor}
          state={state}
          onClose={() => setEditor(undefined)}
          onSaved={async () => {
            await refresh();
            setEditor(undefined);
          }}
        />
      )}
    </div>
  );
  function sourceCard(source: StateView["today"][number]) {
    return (
      <article
        className={`row ${source.acknowledged ? "acknowledged" : ""}`}
        key={source.id}
      >
        <div>
          <h3>{source.title}</h3>
          <p>{source.detail}</p>
        </div>
        <div className="source-actions">
          <button
            aria-label={`编辑 ${source.title}`}
            onClick={() =>
              setEditor(
                source.kind === "vector"
                  ? {
                      kind: "vector",
                      value: state!.vectors.find((v) => v.id === source.id),
                    }
                  : {
                      kind: "item",
                      date: state!.localDate,
                      value: state!.items.find((i) => i.id === source.id),
                    },
              )
            }
          >
            编辑
          </button>
          <label className="ack">
            <input
              type="checkbox"
              checked={source.acknowledged}
              onChange={async (e) => {
                try {
                  await window.workbench.acknowledge(
                    state!.localDate,
                    `${source.kind}:${source.id}`,
                    e.target.checked,
                  );
                  await refresh();
                } catch (error) {
                  setError(String(error));
                }
              }}
            />
            {source.acknowledged ? "今日已确认" : "今日确认"}
          </label>
        </div>
      </article>
    );
  }
}
function calendarDays(month: string): (string | null)[] {
  if (!month) return [];
  const [y, m] = month.split("-").map(Number);
  const first = new Date(2000, m - 1, 1);
  first.setFullYear(y);
  const last = new Date(2000, m, 0);
  last.setFullYear(y);
  if (m === 2)
    last.setDate(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28);
  return [
    ...Array((first.getDay() + 6) % 7).fill(null),
    ...Array.from(
      { length: last.getDate() },
      (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];
}
function EditDialog({
  editor,
  state,
  onClose,
  onSaved,
}: {
  editor: Editor;
  state: StateView;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    ref.current!.showModal();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "");
    try {
      const id = editor.value?.id ?? null;
      if (editor.kind === "track")
        await window.workbench.saveTrack(id, {
          name: get("name"),
          goal: get("goal"),
          phase: get("phase"),
          realState: get("realState"),
          direction: get("direction"),
          status: get("status") as TrackStatus,
        });
      if (editor.kind === "item")
        await window.workbench.saveItem(id, {
          title: get("title"),
          date: get("date"),
          startTime: get("startTime"),
          endTime: get("endTime"),
          trackId: get("trackId") || null,
        });
      if (editor.kind === "vector")
        await window.workbench.saveVector(id, {
          content: get("content"),
          startDate: get("startDate"),
          endDate: get("endDate"),
        });
      await onSaved();
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  }
  const field = (
    label: string,
    name: string,
    value = "",
    type = "text",
    required = false,
  ) => (
    <label>
      {label}
      <input name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
  const area = (label: string, name: string, value = "", required = false) => (
    <label>
      {label}
      <textarea name={name} defaultValue={value} rows={3} required={required} />
    </label>
  );
  return (
    <dialog
      ref={ref}
      aria-labelledby="editor-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={(e) => void submit(e)}>
        <h2 id="editor-title">
          {editor.value ? "编辑" : "新建"}{" "}
          {
            { track: "Track", item: "日程", vector: "Current Vector" }[
              editor.kind
            ]
          }
        </h2>
        <fieldset disabled={busy}>
          {editor.kind === "track" && (
            <>
              {field("名称", "name", editor.value?.name, "text", true)}
              {area("长期目标", "goal", editor.value?.goal)}
              {field("当前阶段", "phase", editor.value?.phase)}
              {area("当前真实状态", "realState", editor.value?.realState)}
              {area("近期方向", "direction", editor.value?.direction)}
              <label>
                状态
                <select
                  name="status"
                  defaultValue={editor.value?.status ?? "Active"}
                >
                  {(Object.keys(statuses) as TrackStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {statuses[s]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {editor.kind === "item" && (
            <>
              {field("标题", "title", editor.value?.title, "text", true)}
              {field(
                "日期",
                "date",
                editor.value?.date ?? editor.date,
                "date",
                true,
              )}
              <div className="pair">
                {field(
                  "开始时间",
                  "startTime",
                  editor.value?.startTime ?? "09:00",
                  "time",
                  true,
                )}
                {field(
                  "结束时间",
                  "endTime",
                  editor.value?.endTime ?? "10:00",
                  "time",
                  true,
                )}
              </div>
              <label>
                关联 Track（可选）
                <select
                  name="trackId"
                  defaultValue={editor.value?.trackId ?? ""}
                >
                  <option value="">不关联</option>
                  {state.tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {statuses[t.status]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {editor.kind === "vector" && (
            <>
              {area("注意力方向", "content", editor.value?.content, true)}
              <div className="pair">
                {field(
                  "开始日期",
                  "startDate",
                  editor.value?.startDate ?? state.localDate,
                  "date",
                  true,
                )}
                {field(
                  "结束日期",
                  "endDate",
                  editor.value?.endDate ?? state.localDate,
                  "date",
                  true,
                )}
              </div>
              <p className="muted">
                开始与结束日期都包含在区间内；同一天只允许一个方向。
              </p>
            </>
          )}
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button type="button" disabled={busy} onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "保存中…" : "保存"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
