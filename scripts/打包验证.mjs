import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
if (process.platform !== "win32")
  throw Error("Windows packaged evidence requires Windows");
const output = resolve("evidence");
mkdirSync(output, { recursive: true });
const userData = mkdtempSync(join(tmpdir(), "pwb-packaged-"));
const executable = resolve("out/win-unpacked/Workbench.exe");
const asarSha256 = createHash("sha256")
  .update(readFileSync(resolve("out/win-unpacked/resources/app.asar")))
  .digest("hex");
const proof = {
  asarSha256,
  platform: process.platform,
  node: process.version,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  executable,
  sha256: createHash("sha256").update(readFileSync(executable)).digest("hex"),
  userData,
  checks: [],
};
let app;
async function launch() {
  const env = { ...process.env, PWB_TEST_USER_DATA: userData };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    executablePath: executable,
    env,
    timeout: 30000,
  });
  const page = await app.firstWindow();
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor();
  return page;
}
async function save(page) {
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}
async function quit() {
  const processHandle = app.process();
  const ended = new Promise((res, rej) => {
    const timer = setTimeout(
      () => rej(Error("real Exit did not terminate process")),
      10000,
    );
    processHandle.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) res();
      else rej(Error(`Exit code ${code}`));
    });
  });
  await app.evaluate(() => {
    globalThis.pwbLifecycle.exitApp();
  });
  await ended;
  app = undefined;
}
try {
  let page = await launch();
  const runtime = await app.evaluate(({ app }) => ({
    packaged: app.isPackaged,
    versions: process.versions,
    dataPath: app.getPath("userData"),
    tray: !globalThis.pwbLifecycle.tray.isDestroyed(),
  }));
  assert.equal(runtime.packaged, true);
  assert.equal(runtime.tray, true);
  assert.equal(runtime.dataPath, userData);
  proof.runtime = runtime;
  assert.match(page.url(), /^file:/);
  proof.checks.push("AC-01 packaged Today without dev server");
  const date = await page.locator(".eyebrow").innerText();
  await page.getByRole("button", { name: "Tracks 长期状态" }).click();
  await page.getByRole("button", { name: "新建 Track", exact: true }).click();
  await page.getByLabel("名称", { exact: true }).fill("CPA");
  await page.getByLabel("长期目标", { exact: true }).fill("通过考试");
  await page.getByLabel("当前阶段", { exact: true }).fill("会计");
  await page.getByLabel("当前真实状态", { exact: true }).fill("第一章已读");
  await page.getByLabel("近期方向", { exact: true }).fill("习题训练");
  await save(page);
  await page.getByRole("button", { name: "Plan 未来安排" }).click();
  await page.getByRole("button", { name: "新建日程", exact: true }).click();
  await page.getByLabel("标题", { exact: true }).fill("会计练习");
  await page
    .getByLabel("关联 Track（可选）")
    .selectOption({ label: "CPA · 进行中" });
  await save(page);
  await page.getByRole("button", { name: "新建 Vector", exact: true }).click();
  await page.getByLabel("注意力方向", { exact: true }).fill("专注 CPA");
  await save(page);
  await page.getByRole("button", { name: "新建 Vector", exact: true }).click();
  await page.getByLabel("注意力方向", { exact: true }).fill("重叠方向");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "重叠" }).waitFor();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  proof.checks.push(
    "AC-03/04 normal UI item/vector create and overlap rejection",
  );
  await page.getByRole("button", { name: "Tracks 长期状态" }).click();
  await page
    .getByRole("button", { name: "编辑 Track CPA", exact: true })
    .click();
  await page.getByLabel("名称", { exact: true }).fill("CPA 改名");
  await page.getByRole("combobox", { name: /^状态/ }).selectOption("Completed");
  await save(page);
  await page.getByRole("button", { name: "已完成", exact: true }).click();
  await page.getByRole("heading", { name: "CPA 改名", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "编辑 Track CPA 改名", exact: true })
    .click();
  await page.getByRole("combobox", { name: /^状态/ }).selectOption("Archived");
  await save(page);
  await page.getByRole("button", { name: "已归档", exact: true }).click();
  await page
    .getByRole("button", { name: "编辑 Track CPA 改名", exact: true })
    .click();
  await page.getByRole("combobox", { name: /^状态/ }).selectOption("Active");
  await save(page);
  await page.getByRole("button", { name: "Today 今日信息" }).click();
  await page.getByText("09:00 — 10:00 · CPA 改名", { exact: true }).waitFor();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("checkbox").nth(1).check();
  await page
    .getByRole("button", { name: "编辑 会计练习", exact: true })
    .click();
  await page.getByLabel("标题", { exact: true }).fill("会计练习已调整");
  await save(page);
  await page.screenshot({ path: join(output, "today.png"), fullPage: true });
  proof.checks.push(
    "AC-02/05/06/13 UI lifecycle, rename link, Today projection, source edit and acknowledgement",
  );
  const backup = join(userData, "manual-backup.sqlite");
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, backup);
  await page.getByRole("button", { name: "备份数据", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "备份已保存" }).waitFor();
  await page
    .getByRole("button", { name: "编辑 会计练习已调整", exact: true })
    .click();
  await page.getByLabel("标题", { exact: true }).fill("备份之后");
  await save(page);
  const invalid = join(userData, "invalid.sqlite");
  writeFileSync(invalid, "invalid");
  async function chooseRestore(path) {
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
      dialog.showMessageBox = async () => ({
        response: 1,
        checkboxChecked: false,
      });
    }, path);
    await page.getByRole("button", { name: "从备份恢复", exact: true }).click();
  }
  await chooseRestore(invalid);
  await page.getByRole("alert").waitFor();
  await page.getByRole("heading", { name: "备份之后", exact: true }).waitFor();
  await chooseRestore(backup);
  await page.getByRole("status").filter({ hasText: "已恢复" }).waitFor();
  await page
    .getByRole("heading", { name: "会计练习已调整", exact: true })
    .waitFor();
  proof.checks.push(
    "AC-08/09 packaged backup, invalid restore rejection, valid restore; native file pickers stubbed only",
  );
  await page.getByRole("button", { name: "Plan 未来安排" }).click();
  await page.screenshot({ path: join(output, "plan.png"), fullPage: true });
  await page.getByRole("button", { name: "下个月" }).click();
  await page.getByRole("button", { name: "本月", exact: true }).click();
  await page
    .getByRole("button", { name: `选择日期 ${date}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "编辑日程 会计练习已调整", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Tracks 长期状态" }).click();
  await page.getByRole("button", { name: "进行中", exact: true }).click();
  await page.getByRole("heading", { name: "CPA 改名", exact: true }).waitFor();
  await page.screenshot({ path: join(output, "tracks.png"), fullPage: true });
  const hidden = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const id = w.id;
    w.close();
    return { id, visible: w.isVisible(), destroyed: w.isDestroyed() };
  });
  assert.equal(hidden.visible, false);
  assert.equal(hidden.destroyed, false);
  assert.equal(app.process().exitCode, null);
  await app.evaluate(() => globalThis.pwbLifecycle.tray.emit("click"));
  await page.waitForFunction(() => document.hasFocus());
  const restored = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    return { id: w.id, visible: w.isVisible(), focused: w.isFocused() };
  });
  assert.deepEqual(restored, { id: hidden.id, visible: true, focused: true });
  await quit();
  proof.checks.push(
    "AC-11 real Tray click event shared handler, close-hide, existing-window focus, explicit Exit process code 0",
  );
  page = await launch();
  assert.equal(await page.getByRole("checkbox").count(), 2);
  assert.equal(await page.getByRole("checkbox").first().isChecked(), true);
  assert.equal(await page.getByRole("checkbox").nth(1).isChecked(), true);
  await page
    .getByRole("heading", { name: "会计练习已调整", exact: true })
    .waitFor();
  await quit();
  proof.checks.push(
    "AC-07 packaged restart preserves restored state and same-date acknowledgements",
  );
  proof.result = "PASS";
} catch (error) {
  proof.result = "FAIL";
  proof.error = String(error);
  if (app) {
    try {
      const page = await app.firstWindow();
      await page.screenshot({ path: join(output, "failure.png") });
    } catch {
      /* 仅失败取证；保留原始测试错误。 */
    }
    await app.close();
  }
  throw error;
} finally {
  writeFileSync(join(output, "packaged.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof, null, 2));
}
