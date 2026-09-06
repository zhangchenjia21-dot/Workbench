import { useEffect, useRef, useState } from "react";
import type { Item, StateView } from "../../个人状态/L3_外交层/状态公开接口";
import "./桌面公开契约";

/** 日期是此详情的固定上下文；所选 ID 只在本次打开期间存在，不能跨日期批量操作。 */
export function DayDetail({
  date,
  initialClear,
  state,
  onClose,
  onChanged,
  onCreate,
  onEdit,
}: {
  date: string;
  initialClear: boolean;
  state: StateView;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onCreate: () => void;
  onEdit: (item: Item) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<
    { ids: string[] | null } | undefined
  >(initialClear ? { ids: null } : undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const items = state.items.filter((item) => item.date === date);
  const chosen = selected.filter((id) => items.some((item) => item.id === id));
  useEffect(() => {
    dialog.current!.showModal();
  }, []);
  async function remove() {
    if (!confirmation) return;
    setBusy(true);
    setError("");
    try {
      await window.workbench.deleteItems(date, confirmation.ids);
      await onChanged();
      setSelected([]);
      setConfirmation(undefined);
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="day-detail"
      aria-labelledby="day-heading"
      onCancel={(event) => {
        if (busy || confirmation) {
          event.preventDefault();
          if (!busy) setConfirmation(undefined);
        } else onClose();
      }}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">PLAN · 当天详情</p>
          <h2 id="day-heading">{date} 的日程</h2>
        </div>
        <button disabled={busy} onClick={onClose}>
          关闭当天详情
        </button>
      </div>
      {confirmation ? (
        <section
          className="delete-confirmation"
          aria-labelledby="delete-heading"
        >
          <h3 id="delete-heading">
            {confirmation.ids === null
              ? `清空 ${date} 的全部日程？`
              : `删除 ${date} 的 ${confirmation.ids.length} 条所选日程？`}
          </h3>
          <p>仅删除这一天的单次日程，其他日期与 Current Vector 不受影响。</p>
          <footer>
            <button
              disabled={busy}
              onClick={() => {
                setConfirmation(undefined);
                setError("");
              }}
            >
              取消删除
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "删除中…" : "确认删除"}
            </button>
          </footer>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <button className="primary" onClick={onCreate}>
              新建日程
            </button>
            <button
              disabled={chosen.length === 0}
              onClick={() => setConfirmation({ ids: chosen })}
            >
              删除所选（{chosen.length}）
            </button>
          </div>
          {items.length === 0 && <p className="empty">这一天还没有安排。</p>}
          <div className="day-items">
            {items.map((item) => (
              <article className="row" key={item.id}>
                <label className="day-selection">
                  <input
                    type="checkbox"
                    aria-label={`选择日程 ${item.title}`}
                    checked={selected.includes(item.id)}
                    onChange={(event) =>
                      setSelected((ids) =>
                        event.target.checked
                          ? [...ids, item.id]
                          : ids.filter((id) => id !== item.id),
                      )
                    }
                  />
                  <span className="sr-only">{item.title}</span>
                </label>
                <div className="day-item-content">
                  <h3>{item.title}</h3>
                  <p>
                    {item.startTime} — {item.endTime}
                    {item.trackId
                      ? ` · ${state.tracks.find((track) => track.id === item.trackId)?.name}`
                      : ""}
                  </p>
                </div>
                <div className="source-actions">
                  <button
                    aria-label={`编辑日程 ${item.title}`}
                    onClick={() => onEdit(item)}
                  >
                    编辑
                  </button>
                  <button
                    aria-label={`删除日程 ${item.title}`}
                    onClick={() => setConfirmation({ ids: [item.id] })}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </dialog>
  );
}

/** 右键只确定日期，不替 Owner 猜选日程；Escape/点击菜单外部均可取消。 */
export function DayMenu({
  menu,
  onClose,
  onAction,
}: {
  menu: { date: string; x: number; y: number };
  onClose: () => void;
  onAction: (action: "new" | "edit" | "clear") => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current!.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="day-menu"
      aria-label={`${menu.date} 快捷操作`}
      style={{
        left: Math.min(menu.x, window.innerWidth - 220),
        top: Math.min(menu.y, window.innerHeight - 200),
      }}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="menu"
        aria-label="日期快捷菜单"
        onKeyDown={(event) => {
          const buttons = Array.from(
            event.currentTarget.querySelectorAll("button"),
          );
          const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            buttons[
              (current + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) %
                buttons.length
            ].focus();
          }
        }}
      >
        <button role="menuitem" onClick={() => onAction("new")}>
          新建日程
        </button>
        <button role="menuitem" onClick={() => onAction("edit")}>
          编辑日程
        </button>
        <button role="menuitem" onClick={() => onAction("clear")}>
          清空日程
        </button>
      </div>
    </dialog>
  );
}
