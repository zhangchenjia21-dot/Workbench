import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  ProjectSource,
  ProjectProposal,
  Track,
} from "../../个人状态/L3_外交层/状态公开接口";
import { summarizeProject } from "../../个人状态/L3_外交层/项目近况接口";
import "./桌面公开契约";
const when = (value: string) => new Date(value).toLocaleString();

/** Today 展示待看的来源变化，Sources 管理来源；都只读同一份本地快照。 */
export function ProjectOverview({
  sources,
  tracks,
  compact,
  onChanged,
  onOpenSources,
}: {
  sources: ProjectSource[];
  tracks: Track[];
  compact: boolean;
  onChanged: () => Promise<void>;
  onOpenSources: () => void;
}) {
  const [connect, setConnect] = useState(false),
    [review, setReview] = useState<ProjectSource>(),
    [remove, setRemove] = useState<ProjectSource>();
  const [busy, setBusy] = useState<string>(),
    [error, setError] = useState("");
  const visible = compact
    ? sources.filter(
        (s) => !s.latest || s.latest.disposition === "new" || s.error,
      )
    : sources;
  async function action(id: string, work: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      try {
        await work();
      } finally {
        await onChanged();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <section
      className="project-overview"
      aria-label={compact ? "项目近况" : "项目来源"}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">来自真实工作的变化</p>
          <h2>{compact ? "项目近况" : "连接一次，持续看见变化"}</h2>
        </div>
        <button
          onClick={() => (compact ? onOpenSources() : setConnect(true))}
          disabled={!compact && sources.length >= 3}
        >
          {compact ? "管理项目来源" : "连接 GitHub 仓库"}
        </button>
      </div>
      {!compact && <GitHubLogin disabled={!!busy} />}
      {!sources.length ? (
        <div className="source-onboarding">
          <h3>不用再抄一遍项目进度。</h3>
          <p>
            把 GitHub 仓库接进来，主线提交、待处理 PR
            和验证结果会在这里汇集。需要更新长期状态时，再由你确认。
          </p>
          <button className="primary" onClick={() => setConnect(true)}>
            连接第一个项目
          </button>
          <p className="muted">
            支持公开及有权限的私有仓库。只读取项目信息，不向 GitHub 写入内容。
          </p>
        </div>
      ) : (
        <p className="muted">
          {compact
            ? "外部变化先成为近况，不会自动改写你的长期状态。"
            : "每 30 分钟自动检查 · 最多 3 个仓库 · 断开来源会保留你的 Track"}
        </p>
      )}
      {!!sources.length && !visible.length && (
        <p className="source-quiet">
          暂时没有未读变化。已保存的近况仍可在项目来源中查看。
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="project-list">
        {visible.map((source) => {
          const update = source.latest,
            snapshot = update?.snapshot,
            summary = snapshot ? summarizeProject(snapshot) : null;
          const track = tracks.find((t) => t.id === source.trackId),
            url = `https://github.com/${source.repository}`;
          return (
            <article
              className={`project-card ${summary?.attention ? "needs-attention" : ""}`}
              key={source.id}
              aria-label={`项目 ${source.repository}`}
            >
              <div className="section-heading">
                <div>
                  <span className="source-origin">
                    GITHUB{snapshot?.private ? " · 私有" : ""} ·{" "}
                    {track ? `关联 ${track.name}` : "尚未关联 Track"}
                  </span>
                  <h3>{source.repository}</h3>
                </div>
                <span className="update-status">
                  {source.error
                    ? "读取未成功"
                    : update?.disposition === "new"
                      ? "新近况"
                      : update?.disposition === "applied"
                        ? "已采用"
                        : update
                          ? "已看过"
                          : "等待首次读取"}
                </span>
              </div>
              {summary && snapshot && (
                <>
                  <h4>{summary.headline}</h4>
                  <p>
                    {summary.verification} · {snapshot.pulls.length}
                    {snapshot.morePulls ? "+" : ""} 个开放 PR
                  </p>
                  <p className="latest-commit">{snapshot.commits[0].title}</p>
                  <p className="muted">
                    主线 {snapshot.branch} ·{" "}
                    {snapshot.commits[0].sha.slice(0, 7)} ·{" "}
                    {when(snapshot.commits[0].date)}
                  </p>
                </>
              )}
              {source.error && (
                <p className="error">
                  {source.error}
                  <br />
                  {update
                    ? `仍显示 ${when(update.fetchedAt)} 保存的近况。`
                    : "还没有保存的项目近况。"}
                </p>
              )}
              <div className="project-actions">
                {update && update.disposition !== "applied" && (
                  <button
                    className="primary"
                    disabled={!!busy || !!source.error}
                    onClick={() => setReview(source)}
                  >
                    {track ? "查看状态建议" : "整理为 Track"}
                  </button>
                )}
                {update?.disposition === "new" && (
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      void action(source.id, () =>
                        window.workbench.seeProjectUpdate(update.id),
                      )
                    }
                  >
                    已看过
                  </button>
                )}
                <button
                  disabled={!!busy}
                  onClick={() =>
                    void action(source.id, () =>
                      window.workbench.refreshSource(source.id),
                    )
                  }
                >
                  {busy === source.id ? "正在检查…" : "检查更新"}
                </button>
                {!compact && (
                  <button onClick={() => setRemove(source)} disabled={!!busy}>
                    断开来源
                  </button>
                )}
              </div>
              <p className="muted">
                {source.checkedAt
                  ? `上次检查 ${when(source.checkedAt)}`
                  : "等待检查"}
              </p>
              {snapshot && (
                <details className="project-evidence">
                  <summary>查看依据 · 最近提交与验证</summary>
                  <p>
                    这是有限范围的项目事实，不代表项目已经完成或产品验收通过。
                  </p>
                  <button
                    className="text-link"
                    onClick={() =>
                      void action(source.id, () =>
                        window.workbench.openGitHub(url),
                      )
                    }
                  >
                    打开 GitHub 仓库 ↗
                  </button>
                  <h4>最近 {snapshot.commits.length} 条主线提交</h4>
                  <ul>
                    {snapshot.commits.map((c) => (
                      <li key={c.sha}>
                        <button
                          className="text-link"
                          onClick={() =>
                            void action(source.id, () =>
                              window.workbench.openGitHub(
                                `${url}/commit/${c.sha}`,
                              ),
                            )
                          }
                        >
                          {c.title} ↗
                        </button>
                        <small>
                          {c.sha.slice(0, 7)} · {when(c.date)}
                        </small>
                      </li>
                    ))}
                  </ul>
                  <h4>开放 PR{snapshot.morePulls ? "（仅最近 20 条）" : ""}</h4>
                  {!snapshot.pulls.length && (
                    <p className="muted">没有开放 PR。</p>
                  )}
                  <ul>
                    {snapshot.pulls.map((p) => (
                      <li key={p.number}>
                        <button
                          className="text-link"
                          onClick={() =>
                            void action(source.id, () =>
                              window.workbench.openGitHub(
                                `${url}/pull/${p.number}`,
                              ),
                            )
                          }
                        >
                          #{p.number} {p.title} ↗
                        </button>
                        <small>{p.draft ? "草稿" : "非草稿 · 待处理"}</small>
                      </li>
                    ))}
                  </ul>
                  <h4>当前提交的验证</h4>
                  <p className="muted">
                    只匹配 {snapshot.commits[0].sha.slice(0, 7)}
                    ，不以旧提交的绿色结果代替当前状态。最多读取最近 10 次运行。
                  </p>
                  <ul>
                    {snapshot.checks.map((c) => (
                      <li key={c.id}>
                        <button
                          className="text-link"
                          onClick={() =>
                            void action(source.id, () =>
                              window.workbench.openGitHub(
                                `${url}/actions/runs/${c.id}`,
                              ),
                            )
                          }
                        >
                          {c.name} · {c.conclusion ?? c.status} ↗
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          );
        })}
      </div>
      {connect && (
        <ConnectProject
          onClose={() => setConnect(false)}
          onConnect={async (repository) => {
            const id = await window.workbench.connectProject(repository);
            setConnect(false);
            await onChanged();
            await action(id, () => window.workbench.refreshSource(id));
          }}
        />
      )}
      {review && review.latest && (
        <ReviewProject
          source={review}
          tracks={tracks}
          onClose={() => setReview(undefined)}
          onSaved={async () => {
            await onChanged();
            setReview(undefined);
          }}
        />
      )}
      {remove && (
        <DisconnectProject
          source={remove}
          onClose={() => setRemove(undefined)}
          onRemove={async () => {
            await window.workbench.disconnectProject(remove.id);
            await onChanged();
            setRemove(undefined);
          }}
        />
      )}
    </section>
  );
}
function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current!.showModal();
    return () => previous?.focus();
  }, []);
  return ref;
}
/** 仅显示账号信息；凭据获取与浏览器授权留在主进程和 Windows GCM。 */
function GitHubLogin({ disabled }: { disabled: boolean }) {
  const [status, setStatus] = useState<{
      accounts: string[];
      error: string | null;
    }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    window.workbench
      .githubStatus()
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {
        if (active) setError("读取登录状态失败，请重试。");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="github-login" aria-label="GitHub 登录">
      <p>
        {status?.accounts.length
          ? `Windows 中已保存账号：${status.accounts.join("、")}`
          : "私有仓库需要 GitHub 登录；公开仓库可直接连接。"}
      </p>
      {status?.error && <p className="muted">{status.error}</p>}
      <button
        type="button"
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await window.workbench.loginGitHub();
            setStatus(await window.workbench.githubStatus());
          } catch {
            setError(
              "登录未完成，请确认浏览器授权，或检查 Git for Windows（含 Git Credential Manager）是否已安装。",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "请在浏览器中完成授权…"
          : status?.accounts.length
            ? "重新登录 GitHub"
            : "登录 GitHub"}
      </button>
      <p className="muted">
        使用 Git for Windows 的官方浏览器登录。Workbench 不保存或显示
        Token，不更改 GitHub 内容。
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
function ConnectProject({
  onClose,
  onConnect,
}: {
  onClose: () => void;
  onConnect: (repository: string) => Promise<void>;
}) {
  const ref = useModal(),
    [repository, setRepository] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onConnect(repository);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      aria-label="连接项目"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={(e) => void submit(e)}>
        <h2>连接一个正在推进的项目</h2>
        <p>填写仓库地址；私有仓库会复用 Windows 中已保存的 GitHub 登录。</p>
        <GitHubLogin disabled={busy} />
        <label>
          GitHub 仓库（公开或私有）
          <input
            autoFocus
            required
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            placeholder="owner/repository"
            disabled={busy}
          />
        </label>
        <button
          type="button"
          className="text-link"
          disabled={busy}
          onClick={() => setRepository("zhangchenjia21-dot/Workbench")}
        >
          先看看 Workbench 项目
        </button>
        <p className="muted">
          通过官方 API 读取最近提交、开放 PR 和 Actions。私有内容保存在本机
          SQLite，也会包含在你的数据备份中。
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "连接中…" : "连接并获取近况"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
function ReviewProject({
  source,
  tracks,
  onClose,
  onSaved,
}: {
  source: ProjectSource;
  tracks: Track[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const ref = useModal(),
    [target, setTarget] = useState(source.trackId ?? ""),
    [proposal, setProposal] = useState<ProjectProposal>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setProposal(undefined);
    setError("");
    window.workbench
      .proposeProjectUpdate(source.latest!.id, target || null)
      .then((p) => {
        if (active) setProposal(p);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [source, target]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!proposal) return;
    setBusy(true);
    setError("");
    try {
      await window.workbench.acceptProjectUpdate(proposal);
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
      className="project-review"
      aria-label="确认项目状态更新"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={(e) => void submit(e)}>
        <p className="eyebrow">{source.repository} · 有出处的建议</p>
        <h2>把项目近况变成你认可的状态</h2>
        <p>
          请核对并调整下面的文字。只有确认后才会写入
          Track；日程、目标、阶段和生命周期不会自动改变。
        </p>
        <fieldset disabled={busy}>
          <label>
            更新到哪个 Track
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">新建一个 Track</option>
              {tracks.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name} · {t.status}
                </option>
              ))}
            </select>
          </label>
          {proposal && (
            <>
              {!target && (
                <label>
                  Track 名称
                  <input
                    required
                    value={proposal.name}
                    onChange={(e) =>
                      setProposal({ ...proposal, name: e.target.value })
                    }
                  />
                </label>
              )}
              <div className="proposal-grid">
                <div>
                  <h3>当前真实状态 · 原值</h3>
                  <p className="before-value">
                    {proposal.expectedTrack?.realState || "尚未填写"}
                  </p>
                </div>
                <label>
                  建议的真实状态
                  <textarea
                    aria-label="建议的真实状态"
                    rows={7}
                    required
                    value={proposal.realState}
                    onChange={(e) =>
                      setProposal({ ...proposal, realState: e.target.value })
                    }
                  />
                </label>
                <div>
                  <h3>近期方向 · 原值</h3>
                  <p className="before-value">
                    {proposal.expectedTrack?.direction || "尚未填写"}
                  </p>
                </div>
                <label>
                  建议的近期方向
                  <textarea
                    aria-label="建议的近期方向"
                    rows={3}
                    value={proposal.direction}
                    onChange={(e) =>
                      setProposal({ ...proposal, direction: e.target.value })
                    }
                  />
                </label>
              </div>
            </>
          )}
        </fieldset>
        {!proposal && !error && <p role="status">正在整理对照…</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" disabled={busy} onClick={onClose}>
            暂不更新
          </button>
          <button className="primary" disabled={!proposal || busy}>
            {busy ? "正在保存…" : "确认写入 Track"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
function DisconnectProject({
  source,
  onClose,
  onRemove,
}: {
  source: ProjectSource;
  onClose: () => void;
  onRemove: () => Promise<void>;
}) {
  const ref = useModal(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <dialog
      ref={ref}
      aria-label="断开项目来源"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <h2>断开 {source.repository}？</h2>
      <p>
        删除这个来源的本地快照，停止自动检查。已经创建或更新的 Track
        保留；GitHub 内容不会改变。
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <footer>
        <button disabled={busy} onClick={onClose}>
          取消
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onRemove();
            } catch (e) {
              setError(String(e));
              setBusy(false);
            }
          }}
        >
          确认断开
        </button>
      </footer>
    </dialog>
  );
}
