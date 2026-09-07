/* global window, Response */
import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const real = process.argv.includes("--real");
const output = resolve("evidence", real ? "project-real" : "project-fixture");
mkdirSync(output, { recursive: true });
const userData = mkdtempSync(join(tmpdir(), "pwb-project-"));
const executable = resolve("out/win-unpacked/Workbench.exe");
const proof = {
  mode: real
    ? "official GitHub API, no network fixture"
    : "deterministic network fixture, production UI/IPC/SQLite",
  startedAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  userData,
  executable,
  asarSha256: createHash("sha256")
    .update(readFileSync(resolve("out/win-unpacked/resources/app.asar")))
    .digest("hex"),
  checks: [],
};
let app, page;
async function launch() {
  const env = { ...process.env, PWB_TEST_USER_DATA: userData };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({ executablePath: executable, env });
  page = await app.firstWindow();
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor();
  assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
  if (!real)
    await app.evaluate(() => {
      globalThis.projectRevision = 1;
      globalThis.projectOffline = false;
      globalThis.fetch = async (url) => {
        if (globalThis.projectOffline) throw Error("测试断网：连接不可用");
        const sha = String(globalThis.projectRevision).repeat(40);
        const body = url.includes("/commits?")
          ? [
              {
                sha,
                commit: {
                  message: `工作台主线变化 ${globalThis.projectRevision}`,
                  committer: { date: "2026-09-06T10:00:00Z" },
                },
              },
            ]
          : url.includes("/pulls?")
            ? [{ number: 27, title: "修复备份边界，等待审核", draft: false }]
            : url.includes("/actions/runs?")
              ? {
                  workflow_runs: [
                    {
                      id: 42,
                      workflow_id: 1,
                      head_sha: sha,
                      name: "Windows regression",
                      status: "completed",
                      conclusion: "failure",
                    },
                  ],
                }
              : {
                  id: 1358719703,
                  full_name: "zhangchenjia21-dot/Workbench",
                  default_branch: "main",
                };
        return new Response(JSON.stringify(body), { status: 200 });
      };
    });
}
const view = () => page.evaluate(() => window.workbench.view());
const sources = () => page.evaluate(() => window.workbench.projectSources());
async function quit() {
  await app.close();
  app = undefined;
}
async function refresh() {
  const before = (await sources())[0].checkedAt;
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await page.waitForFunction(
    (old) =>
      window.workbench.projectSources().then((s) => s[0].checkedAt !== old),
    before,
  );
  await page.getByRole("button", { name: "检查更新", exact: true }).waitFor();
}
try {
  await launch();
  const empty = await view();
  await page
    .getByRole("button", { name: "连接第一个项目", exact: true })
    .click();
  await page.getByRole("button", { name: "先看看 Workbench 项目" }).click();
  await page.getByRole("button", { name: "连接并获取近况" }).click();
  await page
    .getByRole("button", { name: "整理为 Track", exact: true })
    .waitFor({ timeout: 60000 });
  const initial = (await sources())[0];
  assert.ok(initial.latest?.snapshot.commits[0].sha);
  assert.equal(initial.error, null);
  assert.deepEqual(await view(), empty);
  proof.firstSource = initial;
  await page.screenshot({ path: join(output, "today.png"), fullPage: true });
  await page.getByText("查看依据 · 最近提交与验证", { exact: true }).click();
  await page.screenshot({ path: join(output, "evidence.png"), fullPage: true });
  await page.getByRole("button", { name: "整理为 Track", exact: true }).click();
  await page.getByLabel("建议的真实状态", { exact: true }).waitFor();
  const suggested = await page
    .getByLabel("建议的真实状态", { exact: true })
    .inputValue();
  assert.ok(suggested.includes(initial.latest.snapshot.commits[0].title));
  await page.screenshot({ path: join(output, "review.png"), fullPage: true });
  await page.getByRole("button", { name: "暂不更新", exact: true }).click();
  assert.deepEqual(await view(), empty);
  await page.getByRole("button", { name: "整理为 Track", exact: true }).click();
  await page.getByLabel("Track 名称", { exact: true }).fill("Workbench 项目");
  await page
    .getByLabel("建议的近期方向", { exact: true })
    .fill("结合项目证据，继续独立审核与实际体验验证。");
  await page
    .getByRole("button", { name: "确认写入 Track", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "确认项目状态更新" })
    .waitFor({ state: "hidden" });
  const accepted = await view();
  assert.equal(accepted.tracks.length, 1);
  assert.equal(accepted.tracks[0].realState, suggested);
  assert.equal(accepted.tracks[0].status, "Active");
  assert.deepEqual({ ...accepted, tracks: [] }, empty);
  assert.equal((await sources())[0].trackId, accepted.tracks[0].id);
  await page.getByRole("button", { name: "Tracks 长期状态" }).click();
  await page
    .getByRole("heading", { name: "Workbench 项目", exact: true })
    .waitFor();
  await page.screenshot({ path: join(output, "tracks.png"), fullPage: true });
  proof.checks.push(
    "Normal GUI connect -> evidence -> cancel leaves core unchanged -> editable explicit confirmation -> linked Track; Plan and lifecycle unchanged",
  );
  await page.getByRole("button", { name: "Sources 项目来源" }).click();
  if (!real) {
    await refresh();
    assert.equal((await sources())[0].latest.id, initial.latest.id);
    await app.evaluate(() => {
      globalThis.projectRevision = 2;
    });
    await refresh();
    assert.deepEqual(await view(), accepted);
    await page
      .getByRole("button", { name: "查看状态建议", exact: true })
      .click();
    await page.getByLabel("建议的真实状态").waitFor();
    assert.equal(
      await page.getByLabel("更新到哪个 Track").inputValue(),
      accepted.tracks[0].id,
    );
    await page
      .getByLabel("建议的真实状态")
      .fill("已核对新的项目依据，继续处理验证失败。");
    await page
      .getByRole("button", { name: "确认写入 Track", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "确认项目状态更新" })
      .waitFor({ state: "hidden" });
    assert.equal((await view()).tracks[0].id, accepted.tracks[0].id);
    await app.evaluate(() => {
      globalThis.projectRevision = 3;
    });
    await refresh();
    await page.getByRole("button", { name: "已看过", exact: true }).click();
    await page.waitForFunction(() =>
      window.workbench
        .projectSources()
        .then((s) => s[0].latest.disposition === "seen"),
    );
    await refresh();
    assert.equal((await sources())[0].latest.disposition, "seen");
    const stable = (await sources())[0].latest;
    await app.evaluate(() => {
      globalThis.projectOffline = true;
    });
    await refresh();
    assert.ok((await sources())[0].error.includes("测试断网"));
    assert.deepEqual((await sources())[0].latest, stable);
    assert.equal(
      await page
        .getByRole("button", { name: "查看状态建议", exact: true })
        .isDisabled(),
      true,
    );
    await page.screenshot({
      path: join(output, "offline.png"),
      fullPage: true,
    });
    await app.evaluate(() => {
      globalThis.projectOffline = false;
    });
    await refresh();
    proof.checks.push(
      "Repeated refresh dedupes; new evidence does not overwrite Track; existing Track proposal edits same identity; seen stays seen; offline preserves evidence and disables adoption",
    );
  }
  const savedCore = await view(),
    savedSources = await sources();
  const backup = join(userData, "project-backup.sqlite");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, backup);
  await page.getByRole("button", { name: "备份数据", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "备份已保存" }).waitFor();
  await page.getByRole("button", { name: "断开来源", exact: true }).click();
  await page.getByRole("button", { name: "确认断开", exact: true }).click();
  await page
    .getByRole("dialog", { name: "断开项目来源" })
    .waitFor({ state: "hidden" });
  assert.deepEqual(await view(), savedCore);
  assert.deepEqual(await sources(), []);
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
    dialog.showMessageBox = async () => ({
      response: 1,
      checkboxChecked: false,
    });
  }, backup);
  await page.getByRole("button", { name: "从备份恢复", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "已恢复" }).waitFor();
  assert.deepEqual(await sources(), savedSources);
  assert.deepEqual(await view(), savedCore);
  await quit();
  await launch();
  assert.deepEqual(await sources(), savedSources);
  assert.deepEqual(await view(), savedCore);
  await page.getByRole("button", { name: "Sources 项目来源" }).click();
  await page.screenshot({ path: join(output, "sources.png"), fullPage: true });
  proof.checks.push(
    "Disconnect preserves canonical Track; native-picker-only backup/restore roundtrip and packaged restart preserve source, stable IDs, snapshots and canonical core",
  );
  proof.finalSource = savedSources[0];
  proof.finalTrack = savedCore.tracks[0];
  proof.result = "ENGINEERING_VALIDATION_PASS";
  await quit();
} catch (error) {
  proof.result = "FAIL";
  proof.error = String(error);
  if (app) {
    await page
      .screenshot({ path: join(output, "failure.png") })
      .catch(() => {});
    await app.close();
  }
  throw error;
} finally {
  proof.finishedAt = new Date().toISOString();
  writeFileSync(join(output, "proof.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}
