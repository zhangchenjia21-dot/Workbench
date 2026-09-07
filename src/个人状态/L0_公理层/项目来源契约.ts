import { textField, type Track } from "./状态契约";

/** 一次有限读取的外部事实；repositoryId 检测同名仓库替换，checks 只属于首条提交。 */
export interface ProjectSnapshot {
  repositoryId: number;
  /** 旧快照未记录可见性；不能把缺失值推断成公开。 */
  private?: boolean;
  repository: string;
  branch: string;
  commits: { sha: string; title: string; date: string }[];
  pulls: { number: number; title: string; draft: boolean }[];
  morePulls: boolean;
  checksAvailable: boolean;
  checks: {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
  }[];
}
/** 快照 ID 稳定；处理状态只表示阅读/采用，不表示工作完成。 */
export interface ProjectUpdate {
  id: string;
  sourceId: string;
  fetchedAt: string;
  snapshot: ProjectSnapshot;
  disposition: "new" | "seen" | "applied";
}
/** 关联必须由 Owner 明确确认；读取失败保留 latest，同时公开检查时间与错误。 */
export interface ProjectSource {
  id: string;
  repository: string;
  trackId: string | null;
  checkedAt: string | null;
  error: string | null;
  latest: ProjectUpdate | null;
}
/** 暂存可编辑提案；expectedTrack 是确认冲突对照，不是新的 canonical 副本。 */
export interface ProjectProposal {
  updateId: string;
  sourceId: string;
  expectedTrack: Track | null;
  name: string;
  realState: string;
  direction: string;
}
/** 只接受 GitHub 仓库标识；不接受任意 URL、用户凭据、路径或 query。 */
export function repositoryName(input: string): string {
  textField(input, "仓库", true);
  const value = input
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\/$/, "")
    .replace(/\.git$/i, "");
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9_.-]{1,100}$/.test(value) ||
    value.endsWith("/.") ||
    value.endsWith("/..")
  )
    throw Error("请输入公开仓库的 owner/repo 或 https://github.com/owner/repo");
  return value.toLowerCase();
}
const bounded = (v: unknown, max = 500) =>
  typeof v === "string" && v.length > 0 && v.length <= max;
/** 导入与恢复共同使用的边界校验；快照仅含白名单事实，不执行来源内容。 */
export function validateProjectSnapshot(s: ProjectSnapshot): void {
  if (
    !s ||
    (s.private !== undefined && typeof s.private !== "boolean") ||
    !Number.isSafeInteger(s.repositoryId) ||
    s.repositoryId <= 0 ||
    repositoryName(s.repository) !== s.repository ||
    !bounded(s.branch, 250) ||
    !Array.isArray(s.commits) ||
    s.commits.length < 1 ||
    s.commits.length > 5 ||
    !Array.isArray(s.pulls) ||
    s.pulls.length > 20 ||
    !Array.isArray(s.checks) ||
    s.checks.length > 10 ||
    typeof s.morePulls !== "boolean" ||
    typeof s.checksAvailable !== "boolean"
  )
    throw Error("项目快照结构无效");
  if (
    s.commits.some(
      (c) =>
        !/^[0-9a-f]{40}$/.test(c.sha) ||
        !bounded(c.title) ||
        !Number.isFinite(Date.parse(c.date)),
    ) ||
    s.pulls.some(
      (p) =>
        !Number.isSafeInteger(p.number) ||
        p.number < 1 ||
        !bounded(p.title) ||
        typeof p.draft !== "boolean",
    ) ||
    s.checks.some(
      (c) =>
        !Number.isSafeInteger(c.id) ||
        c.id < 1 ||
        !bounded(c.name) ||
        !bounded(c.status) ||
        !(c.conclusion === null || bounded(c.conclusion)),
    )
  )
    throw Error("项目证据无效");
  if (
    new Set(s.commits.map((c) => c.sha)).size !== s.commits.length ||
    new Set(s.pulls.map((p) => p.number)).size !== s.pulls.length ||
    new Set(s.checks.map((c) => c.id)).size !== s.checks.length
  )
    throw Error("项目证据重复");
}
/** 规则只总结可观察事实；CI success 不推断 Track 完成或 Product PASS。 */
export function summarizeProject(s: ProjectSnapshot) {
  const failed = s.checks.filter((c) =>
    ["failure", "timed_out", "action_required", "startup_failure"].includes(
      c.conclusion ?? "",
    ),
  );
  const running = s.checks.some((c) => c.status !== "completed");
  const ready = s.pulls.filter((p) => !p.draft);
  const verification = !s.checksAvailable
    ? "当前提交的验证信息不可用"
    : !s.checks.length
      ? "当前提交尚未找到验证记录"
      : failed.length
        ? `${failed.length} 项验证未通过`
        : running
          ? "当前提交正在验证"
          : s.checks.every((c) => c.conclusion === "success")
            ? "当前提交的验证已通过"
            : "当前提交的验证未全部通过（含取消或跳过）";
  const headline = failed.length
    ? "主线验证需要关注"
    : ready.length
      ? `${ready.length}${s.morePulls ? "+" : ""} 个 PR 等待处理`
      : running
        ? "主线更新，验证进行中"
        : "主线近况已汇集";
  const direction = failed.length
    ? "先查看失败的验证记录，确认影响后再推进。"
    : ready.length
      ? `查看待处理 PR：${ready
          .slice(0, 3)
          .map((p) => `#${p.number} ${p.title}`)
          .join("；")}。`
      : running
        ? "等待当前提交的验证结果，再判断下一步。"
        : "结合这次主线变化，确认接下来的工作重点。";
  const realState = `${s.repository} · ${s.branch}\n最近提交：${s.commits[0].title}（${s.commits[0].sha.slice(0, 7)}）\n${verification}。开放 PR：${s.pulls.length}${s.morePulls ? "+" : ""} 个，其中 ${ready.length} 个非草稿。`;
  return {
    headline,
    verification,
    direction,
    realState,
    attention: failed.length > 0 || ready.length > 0,
  };
}
