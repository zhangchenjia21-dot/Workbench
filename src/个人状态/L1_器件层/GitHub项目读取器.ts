import {
  repositoryName,
  validateProjectSnapshot,
  type ProjectSnapshot,
} from "../L0_公理层/项目来源契约";
type Json = Record<string, unknown>;
function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("GitHub 返回格式不正确");
  return value as Json;
}
function list(value: unknown): Json[] {
  if (!Array.isArray(value)) throw Error("GitHub 返回列表无效");
  return value.map(object);
}
function str(v: unknown): string {
  if (typeof v !== "string") throw Error("GitHub 字段格式无效");
  return v;
}
function num(v: unknown): number {
  if (!Number.isSafeInteger(v)) throw Error("GitHub 标识无效");
  return v as number;
}
const title = (v: unknown) =>
  str(v).split(/\r?\n/)[0].slice(0, 500) || "（无标题）";
/** 固定官方只读 API；无 token/本地文件上传；超时、重定向和超大响应明确失败。 */
export async function readGitHubProject(
  input: string,
  request: typeof fetch = fetch,
): Promise<ProjectSnapshot> {
  const repository = repositoryName(input),
    base = `https://api.github.com/repos/${repository}`;
  async function get(suffix: string, optional = false): Promise<unknown> {
    const response = await request(base + suffix, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Personal-Workbench",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (optional && response.status === 404) return null;
    if (!response.ok) {
      if (response.status === 403 || response.status === 429)
        throw Error("GitHub 暂时限制请求，请稍后刷新；已保存的近况不受影响。");
      if (response.status === 404)
        throw Error("找不到这个公开仓库；当前版本不连接私有仓库。");
      throw Error(`GitHub 读取失败（${response.status}），稍后可重试。`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error("GitHub 返回空响应");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) {
          await reader.cancel();
          throw Error("GitHub 响应过大，本次未导入");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  const repo = object(await get(""));
  if (repositoryName(str(repo.full_name)) !== repository)
    throw Error("仓库地址已变化，请使用当前仓库地址重新连接。");
  const branch = str(repo.default_branch);
  const [rawCommits, rawPulls, rawRuns] = await Promise.all([
    get(`/commits?sha=${encodeURIComponent(branch)}&per_page=5`),
    get("/pulls?state=open&sort=updated&direction=desc&per_page=21"),
    get(`/actions/runs?branch=${encodeURIComponent(branch)}&per_page=10`, true),
  ]);
  const commits = list(rawCommits).map((c) => ({
    sha: str(c.sha),
    title: title(object(c.commit).message),
    date: str(object(object(c.commit).committer).date),
  }));
  if (!commits.length) throw Error("这个仓库还没有可读取的提交。");
  const pulls = list(rawPulls);
  const workflows = new Set<number>();
  const runs =
    rawRuns === null
      ? []
      : list(object(rawRuns).workflow_runs).filter((r) => {
          if (r.head_sha !== commits[0].sha) return false;
          const id = num(r.workflow_id);
          if (workflows.has(id)) return false;
          workflows.add(id);
          return true;
        });
  const result: ProjectSnapshot = {
    repositoryId: num(repo.id),
    repository,
    branch,
    commits,
    pulls: pulls
      .slice(0, 20)
      .map((p) => ({
        number: num(p.number),
        title: title(p.title),
        draft: p.draft === true,
      })),
    morePulls: pulls.length > 20,
    checksAvailable: rawRuns !== null,
    checks: runs.map((r) => ({
      id: num(r.id),
      name: title(r.name),
      status: str(r.status),
      conclusion: r.conclusion === null ? null : str(r.conclusion),
    })),
  };
  validateProjectSnapshot(result);
  return result;
}
