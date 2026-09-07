import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  openWorkbench,
  type ProjectSnapshot,
} from "../src/个人状态/L3_外交层/状态公开接口";
import {
  repositoryName,
  summarizeProject,
} from "../src/个人状态/L0_公理层/项目来源契约";
import { readGitHubProject } from "../src/个人状态/L1_器件层/GitHub项目读取器";
import {
  connect,
  migrations,
  validateDatabase,
  version,
  APP_ID,
} from "../src/个人状态/L1_器件层/数据库结构";
export const sample: ProjectSnapshot = {
  repositoryId: 1358719703,
  repository: "zhangchenjia21-dot/workbench",
  branch: "main",
  commits: [
    {
      sha: "a".repeat(40),
      title: "修复恢复流程",
      date: "2026-09-07T01:00:00Z",
    },
  ],
  pulls: [{ number: 2, title: "待评审的来源连接", draft: false }],
  morePulls: false,
  checksAvailable: true,
  checks: [
    { id: 123, name: "Windows", status: "completed", conclusion: "failure" },
  ],
};
const trackDraft = {
  name: "真实项目",
  goal: "降低重复录入",
  phase: "产品验证",
  realState: "我手工确认的原状态",
  direction: "先确认价值",
  status: "Active" as const,
};
const fixture = () => mkdtempSync(join(tmpdir(), "pwb-project-"));

test("项目读取：固定官方API、当前SHA验证、草稿区分与无旧绿色误判", async () => {
  const seen: string[] = [];
  const request: typeof fetch = async (input, init) => {
    const url = String(input);
    seen.push(url);
    assert.equal(init!.redirect, "error");
    assert.equal(new URL(url).origin, "https://api.github.com");
    const data = url.includes("/commits?")
      ? [
          {
            sha: sample.commits[0].sha,
            commit: {
              message: "修复恢复流程\n不要执行这段外部文字",
              committer: { date: sample.commits[0].date },
            },
          },
        ]
      : url.includes("/pulls?")
        ? [
            { number: 2, title: "待评审的来源连接", draft: false },
            { number: 3, title: "草稿", draft: true },
          ]
        : url.includes("/actions/runs?")
          ? {
              workflow_runs: [
                {
                  head_sha: "b".repeat(40),
                  id: 125,
                  workflow_id: 1,
                  name: "旧绿色",
                  status: "completed",
                  conclusion: "success",
                },
                {
                  head_sha: sample.commits[0].sha,
                  id: 123,
                  workflow_id: 1,
                  name: "Windows",
                  status: "completed",
                  conclusion: "failure",
                },
                {
                  head_sha: sample.commits[0].sha,
                  id: 122,
                  workflow_id: 1,
                  name: "旧运行",
                  status: "completed",
                  conclusion: "success",
                },
              ],
            }
          : {
              id: sample.repositoryId,
              full_name: "zhangchenjia21-dot/Workbench",
              default_branch: "main",
            };
    return new Response(JSON.stringify(data));
  };
  const result = await readGitHubProject(
    "https://github.com/zhangchenjia21-dot/Workbench",
    request,
  );
  assert.equal(seen.length, 4);
  assert.deepEqual(result.checks, sample.checks);
  assert.equal(result.pulls[1].draft, true);
  assert.equal(summarizeProject(result).headline, "主线验证需要关注");
  assert.doesNotMatch(summarizeProject(result).realState, /产品.*通过|已完成/);
  for (const input of [
    "https://evil.test/a/b",
    "https://github.com/a/b?token=secret",
    "a/..",
    "file:///x",
    "a/b/commits",
    "a/b#x",
  ])
    assert.throws(() => repositoryName(input));
  await assert.rejects(
    readGitHubProject("a/b", async () => new Response("", { status: 403 })),
    /限制请求/,
  );
  await assert.rejects(
    readGitHubProject(
      "a/b",
      async () =>
        new Response(
          JSON.stringify({
            id: 1,
            full_name: "other/repo",
            default_branch: "main",
          }),
        ),
    ),
    /地址已变化/,
  );
});

test("来源到Track：去重、已读不重现、显式确认、人工编辑冲突、保留目标阶段和Plan", async () => {
  const dir = fixture(),
    path = join(dir, "live.sqlite");
  let snapshot = structuredClone(sample),
    failure = false;
  const app = openWorkbench(path, async () => {
    if (failure) throw Error("offline");
    return snapshot;
  });
  try {
    const trackId = app.saveTrack(null, trackDraft);
    app.saveItem(null, {
      title: "已安排",
      date: "2026-09-07",
      startTime: "09:00",
      endTime: "10:00",
      trackId,
    });
    const baseline = app.view("2026-09-07");
    const source = app.connectProject(sample.repository);
    await app.refreshSource(source);
    assert.deepEqual(app.view("2026-09-07"), baseline);
    const update = app.projectSources()[0].latest!;
    app.seeProjectUpdate(update.id);
    await app.refreshSource(source);
    assert.equal(app.projectSources()[0].latest!.id, update.id);
    assert.equal(app.projectSources()[0].latest!.disposition, "seen");
    const proposal = app.proposeProjectUpdate(update.id, trackId);
    app.saveTrack(trackId, { ...trackDraft, realState: "Owner 刚改的状态" });
    assert.throws(() => app.acceptProjectUpdate(proposal), /已被修改/);
    const latest = app.proposeProjectUpdate(update.id, trackId);
    latest.realState = "确认后的项目近况";
    assert.equal(app.acceptProjectUpdate(latest), trackId);
    const after = app.view("2026-09-07");
    assert.deepEqual(after.items, baseline.items);
    assert.equal(after.tracks[0].goal, trackDraft.goal);
    assert.equal(after.tracks[0].phase, trackDraft.phase);
    assert.equal(after.tracks[0].status, "Active");
    assert.equal(after.tracks[0].realState, latest.realState);
    assert.throws(() => app.acceptProjectUpdate(latest), /已经采用/);
    snapshot = {
      ...snapshot,
      checks: [{ ...snapshot.checks[0], conclusion: "success" }],
      pulls: [],
    };
    await app.refreshSource(source);
    assert.equal(app.projectSources()[0].latest!.disposition, "new");
    const freshId = app.projectSources()[0].latest!.id;
    assert.throws(() => app.proposeProjectUpdate(update.id, trackId), /新近况/);
    assert.equal(
      app.proposeProjectUpdate(freshId, trackId).direction,
      after.tracks[0].direction,
      "无行动证据时保留人工方向",
    );
    const stored = app.projectSources()[0].latest;
    failure = true;
    await assert.rejects(app.refreshSource(source), /offline/);
    assert.deepEqual(app.projectSources()[0].latest, stored);
    assert.deepEqual(app.view("2026-09-07"), after);
    assert.throws(() => app.proposeProjectUpdate(freshId, trackId), /读取失败/);
    failure = false;
    snapshot = { ...snapshot, repositoryId: 999 };
    await assert.rejects(app.refreshSource(source), /身份已变化/);
    assert.deepEqual(app.projectSources()[0].latest, stored);
    snapshot = { ...snapshot, repositoryId: sample.repositoryId };
    await app.refreshSource(source);
    assert.throws(
      () => app.connectProject(sample.repository.toUpperCase()),
      /已经连接/,
    );
    app.connectProject("owner/two");
    app.connectProject("owner/three");
    assert.throws(() => app.connectProject("owner/four"), /最多/);
    app.disconnectProject(source);
    assert.deepEqual(app.view("2026-09-07"), after);
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
});

test("来源确认创建Track、完整快照/重启/恢复、篡改来源候选拒绝与20条保留边界", async () => {
  const dir = fixture(),
    path = join(dir, "live.sqlite");
  let snapshot = structuredClone(sample);
  let app = openWorkbench(path, async () => snapshot);
  try {
    const id = app.connectProject(sample.repository);
    await app.refreshSource(id);
    const proposal = app.proposeProjectUpdate(
      app.projectSources()[0].latest!.id,
      null,
    );
    const trackId = app.acceptProjectUpdate(proposal);
    assert.equal(app.view().tracks[0].id, trackId);
    assert.equal(app.projectSources()[0].trackId, trackId);
    const core = app.view(),
      sources = app.projectSources(),
      backup = join(dir, "backup.sqlite");
    app.backup(backup);
    const standalone = openWorkbench(backup);
    assert.deepEqual(standalone.projectSources(), sources);
    assert.deepEqual(standalone.view(), core);
    standalone.close();
    app.disconnectProject(id);
    app.restore(backup);
    assert.deepEqual(app.projectSources(), sources);
    app.close();
    app = openWorkbench(path, async () => snapshot);
    assert.deepEqual(app.view(), core);
    assert.deepEqual(app.projectSources(), sources);
    const bad = join(dir, "bad.sqlite");
    app.backup(bad);
    const db = connect(bad);
    db.prepare("UPDATE project_updates SET payload=?").run(
      JSON.stringify({ ...sample, repository: "wrong/repo" }),
    );
    db.close();
    assert.throws(() => app.restore(bad), /来源身份/);
    assert.deepEqual(app.projectSources(), sources);
    for (let i = 0; i < 25; i++) {
      snapshot = {
        ...sample,
        commits: [
          { ...sample.commits[0], sha: i.toString(16).padStart(40, "0") },
        ],
      };
      await app.refreshSource(id);
    }
    const check = connect(path, true);
    validateDatabase(check);
    assert.equal(
      check.prepare("SELECT count(*) AS n FROM project_updates").get()!.n,
      20,
    );
    check.close();
    assert.deepEqual(app.view(), core, "外部多次变化不覆盖已确认状态");
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
});

test("异步刷新：同源合并、restore后的旧结果不写库、断开/关闭时丢弃", async () => {
  const dir = fixture(),
    path = join(dir, "live.sqlite");
  let resolve!: (value: ProjectSnapshot) => void;
  let calls = 0;
  const app = openWorkbench(path, () => {
    calls++;
    return new Promise<ProjectSnapshot>((r) => {
      resolve = r;
    });
  });
  let closed = false;
  try {
    const id = app.connectProject(sample.repository),
      backup = join(dir, "before.sqlite");
    app.backup(backup);
    const first = app.refreshSource(id);
    assert.equal(app.refreshSource(id), first);
    await Promise.resolve();
    assert.equal(calls, 1);
    app.restore(backup);
    resolve(sample);
    await assert.rejects(first, /旧请求/);
    assert.equal(app.projectSources()[0].latest, null);
    const second = app.refreshSource(id);
    await Promise.resolve();
    app.disconnectProject(id);
    resolve(sample);
    await assert.rejects(second, /已断开/);
    assert.deepEqual(app.projectSources(), []);
    const thirdId = app.connectProject(sample.repository),
      third = app.refreshSource(thirdId);
    await Promise.resolve();
    app.close();
    closed = true;
    resolve(sample);
    await assert.rejects(third, /旧请求/);
  } finally {
    if (!closed) app.close();
    rmSync(dir, { recursive: true });
  }
});

test("v3→v4沿用旧合同：完整旧图、安全快照、失败回滚、旧备份staging恢复", () => {
  const dir = fixture(),
    seed = join(dir, "seed.sqlite"),
    path = join(dir, "v3.sqlite");
  try {
    const base = openWorkbench(seed),
      trackId = base.saveTrack(null, trackDraft),
      date = "2026-09-07";
    const item = base.saveItem(null, {
      title: "事项",
      date,
      startTime: "09:00",
      endTime: "10:00",
      trackId,
    });
    base.acknowledge(date, `item:${item}`, true);
    base.saveVector(null, { content: "方向", startDate: date, endDate: date });
    const series = base.saveSeries(null, {
      title: "循环",
      startDate: date,
      endDate: null,
      startTime: "10:00",
      endTime: "11:00",
      pattern: "daily",
      weekdays: [],
      trackId,
    });
    base.saveException(series, `${date}T10:00`, null);
    base.saveReminder(null, { content: "提醒", date, time: null });
    base.saveMemo(null, { content: "备忘", date });
    base.saveUnscheduled(null, { content: "未定", trackId });
    const expected = base.view(date);
    base.close();
    const db = connect(path);
    db.exec(
      `PRAGMA application_id=${APP_ID};${migrations.slice(0, 3).join("\n")}PRAGMA user_version=3;`,
    );
    db.prepare("ATTACH DATABASE ? AS prior").run(seed);
    for (const table of [
      "tracks",
      "items",
      "vectors",
      "acknowledgements",
      "series",
      "exceptions",
      "reminders",
      "memos",
      "unscheduled",
    ])
      db.exec(`INSERT INTO main.${table} SELECT * FROM prior.${table}`);
    db.exec("DETACH DATABASE prior");
    validateDatabase(db);
    db.close();
    const step = migrations[3];
    try {
      migrations[3] = `${step} UPDATE tracks SET name='bad'; SELECT * FROM missing;`;
      assert.throws(() => openWorkbench(path), /回滚/);
    } finally {
      migrations[3] = step;
    }
    const old = connect(path, true);
    assert.equal(version(old), 3);
    assert.equal(
      old.prepare("SELECT name FROM tracks").get()!.name,
      trackDraft.name,
    );
    validateDatabase(old);
    old.close();
    const upgraded = openWorkbench(path);
    assert.deepEqual(upgraded.view(date), expected);
    assert.deepEqual(upgraded.projectSources(), []);
    upgraded.close();
    const safety = readdirSync(join(dir, "safety"));
    assert.equal(safety.length, 2);
    const original = join(dir, "safety", safety[0]);
    const backup = connect(original, true);
    assert.equal(version(backup), 3);
    validateDatabase(backup);
    backup.close();
    const target = openWorkbench(join(dir, "target.sqlite"));
    target.connectProject(sample.repository);
    target.restore(original);
    assert.deepEqual(target.view(date), expected);
    assert.deepEqual(target.projectSources(), []);
    target.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
