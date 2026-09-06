/* global window */
import assert from "node:assert/strict";
import { join } from "node:path";
/** 所有事实经普通表单写入；view 只用于验证身份/隔离，不通过测试 API 变更数据。 */
export async function verifyV0(page, app, today, output, userData, checks) {
  const state = () => page.evaluate(() => window.workbench.view());
  const day = (delta) => {
    const [y, m, d] = today.split("-").map(Number);
    const date = new Date(y, m - 1, d + delta, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const recurrence = () => page.locator("dialog:has(#recurrence-heading)");
  const information = () => page.locator("dialog:has(#information-heading)");
  const saveSeries = async () => {
    await button("保存循环").click();
    await recurrence().waitFor({ state: "hidden" });
  };
  const plan = async () => {
    await button("Plan 未来安排").click();
  };
  async function showDate(date) {
    await plan();
    await button("月视图").click();
    await button("本月").click();
    if (date.slice(0, 7) !== today.slice(0, 7)) await button("下个月").click();
    await button(`选择日期 ${date}`).click();
    return page.getByRole("dialog", { name: `${date} 的日程`, exact: true });
  }
  const closeDay = () => button("关闭当天详情").click();
  async function createSeries(title, weekly = false) {
    await plan();
    await button("新建循环日程").click();
    await page.getByLabel("循环标题", { exact: true }).fill(title);
    await page.getByLabel("开始日期", { exact: true }).fill(today);
    await page.getByLabel("结束日期（可选）", { exact: true }).fill(day(8));
    await page
      .getByLabel("关联 Track（可选）")
      .selectOption({ label: "CPA 改名" });
    if (weekly) {
      await page.getByLabel("重复模式").selectOption("weekly");
      await page.getByLabel("周一", { exact: true }).check();
      await page.getByLabel("周三", { exact: true }).check();
    }
    await saveSeries();
  }
  await createSeries("每日阅读");
  await createSeries("每周复盘", true);
  let current = await state();
  const daily = current.series.find((s) => s.title === "每日阅读"),
    weekly = current.series.find((s) => s.title === "每周复盘");
  assert.deepEqual(weekly.weekdays, [1, 3]);
  assert.equal(daily.trackId, current.tracks[0].id);
  assert.equal(
    await page.getByText("这一次及以后", { exact: true }).count(),
    0,
  );
  // 验证 weekly 的两个星期与 end 边界确实进入正常日历 GUI。
  const offsets = [0, 1, 2, 3, 4, 5, 6, 8, 9];
  for (const offset of offsets) {
    const date = day(offset),
      detail = await showDate(date);
    const [y, m, d] = date.split("-").map(Number),
      dow = new Date(y, m - 1, d, 12).getDay();
    assert.equal(
      await detail
        .getByRole("heading", { name: "每日阅读", exact: true })
        .count(),
      offset <= 8 ? 1 : 0,
    );
    assert.equal(
      await detail
        .getByRole("heading", { name: "每周复盘", exact: true })
        .count(),
      offset <= 8 && [1, 3].includes(dow) ? 1 : 0,
    );
    await closeDay();
  }
  async function moveTomorrow() {
    await showDate(day(1));
    await button("编辑循环日程 每日阅读").click();
    assert.equal(
      await recurrence()
        .getByRole("button", { name: "仅这一次", exact: true })
        .count(),
      1,
    );
    assert.equal(
      await recurrence()
        .getByRole("button", { name: "整个循环", exact: true })
        .count(),
      1,
    );
    await button("仅这一次").click();
    await page.getByLabel("日期", { exact: true }).fill(today);
    await page.getByLabel("循环标题", { exact: true }).fill("移入阅读");
    await page.getByLabel("开始时间", { exact: true }).fill("15:00");
    await page.getByLabel("结束时间", { exact: true }).fill("16:00");
    await saveSeries();
    await closeDay();
  }
  await moveTomorrow();
  current = await state();
  const originalKey = `${day(1)}T09:00`;
  assert.equal(
    current.today.find((s) => s.title === "移入阅读").id,
    `${daily.id}@${originalKey}`,
  );
  assert.deepEqual(
    current.series.find((s) => s.id === daily.id),
    daily,
  );
  await showDate(day(2));
  await button("删除循环日程 每日阅读").click();
  await button("仅这一次").click();
  await button("确认删除循环").click();
  await recurrence().waitFor({ state: "hidden" });
  await closeDay();
  const withExceptions = await state();
  assert.equal(withExceptions.exceptions.length, 2);
  assert.deepEqual(
    withExceptions.series.find((s) => s.id === daily.id),
    daily,
  );
  await showDate(today);
  await button("编辑循环日程 每日阅读").click();
  await button("整个循环").click();
  await recurrence()
    .getByText(/继续保存整个循环将清除/)
    .waitFor();
  await page.screenshot({ path: join(output, "v0-exception-warning.png") });
  await button("取消").click();
  assert.deepEqual(await state(), withExceptions);
  await button("编辑循环日程 每日阅读").click();
  await button("整个循环").click();
  await page.getByLabel("我确认清除现有单次例外").check();
  await saveSeries();
  await closeDay();
  assert.equal((await state()).exceptions.length, 0);
  await moveTomorrow();
  await showDate(day(2));
  await button("删除循环日程 每日阅读").click();
  await button("仅这一次").click();
  await button("确认删除循环").click();
  await recurrence().waitFor({ state: "hidden" });
  await closeDay();
  checks.push(
    "PWB-002 AC-02..07 normal UI daily/weekly; moved original identity; single delete; whole-series exceptions cancel unchanged / confirm clears",
  );
  await page.locator("summary").click();
  await button("删除整个循环 每周复盘").click();
  await button("确认删除循环").click();
  await recurrence().waitFor({ state: "hidden" });
  current = await state();
  assert.deepEqual(
    current.series.map((s) => s.id),
    [daily.id],
  );
  assert.equal(current.items.length, 1);
  assert.equal(current.exceptions.length, 2);
  await createSeries("每周复盘", true);
  async function createInfo(kind, content, date = today) {
    await button(`新建 ${kind}`).click();
    await information().locator("textarea").fill(content);
    if (kind !== "Unscheduled")
      await information().locator('input[type="date"]').fill(date);
    if (kind === "Unscheduled")
      await information()
        .getByLabel("关联 Track（可选）")
        .selectOption({ label: "CPA 改名" });
    await button("保存信息").click();
    await information().waitFor({ state: "hidden" });
  }
  for (const kind of ["Reminder", "Memo", "Unscheduled"]) {
    await createInfo(kind, `${kind} 临时`);
    await button(`编辑 ${kind} ${kind} 临时`).click();
    await information().locator("textarea").fill(`${kind} 临时已改`);
    await button("保存信息").click();
    await information().waitFor({ state: "hidden" });
    const before = await state();
    await button(`删除 ${kind} ${kind} 临时已改`).click();
    await button("取消").click();
    assert.deepEqual(await state(), before);
    await button(`删除 ${kind} ${kind} 临时已改`).click();
    await button("确认删除信息").click();
    await information().waitFor({ state: "hidden" });
    await createInfo(kind, `${kind} 保留`);
    if (kind !== "Unscheduled") await createInfo(kind, `${kind} 未来`, day(1));
  }
  await page.screenshot({
    path: join(output, "v0-plan-information.png"),
    fullPage: true,
  });
  await showDate(today);
  await closeDay();
  await button("周视图").click();
  const week = page.getByLabel("周历", { exact: true });
  await week.getByText("15:00 — 16:00 · 循环", { exact: true }).waitFor();
  await page.screenshot({ path: join(output, "v0-week.png"), fullPage: true });
  await button("下一周").click();
  await button("上一周").click();
  await button(`选择日期 ${today}`).click();
  await button("编辑循环日程 移入阅读").click();
  await button("仅这一次").click();
  await page.getByLabel("循环标题", { exact: true }).fill("周视图已改阅读");
  await saveSeries();
  await closeDay();
  await week.getByText("周视图已改阅读", { exact: false }).waitFor();
  await button("月视图").click();
  const todayCell = button(`选择日期 ${today}`);
  await todayCell.getByText("周视图已改阅读", { exact: true }).waitFor();
  assert.doesNotMatch(await todayCell.innerText(), /\d\d:\d\d/);
  await page.screenshot({ path: join(output, "v0-month.png"), fullPage: true });
  // 同日清空继续只删除单次事项；循环例外与定义不受影响，取消完全不写入。
  await todayCell.click({ button: "right" });
  await page.getByRole("menuitem", { name: "清空日程", exact: true }).click();
  const beforeClear = await state();
  await button("取消删除").click();
  assert.deepEqual(await state(), beforeClear);
  await closeDay();
  await button("Today 今日信息").click();
  const movedCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: "周视图已改阅读", exact: true }),
  });
  const beforeAck = await state();
  await movedCard.getByRole("checkbox").check();
  current = await state();
  assert.deepEqual(current.series, beforeAck.series);
  assert.deepEqual(current.exceptions, beforeAck.exceptions);
  assert.deepEqual(current.tracks, beforeAck.tracks);
  assert.equal(
    current.today.find((s) => s.title === "周视图已改阅读").id,
    `${daily.id}@${originalKey}`,
  );
  assert.equal(
    current.today.find((s) => s.title === "周视图已改阅读").acknowledged,
    true,
  );
  for (const kind of ["reminder", "memo"]) {
    const region = page.getByRole("region", { name: `Today ${kind}` });
    assert.equal(await region.getByRole("checkbox").count(), 0);
    assert.equal(await region.getByRole("button").count(), 0);
  }
  assert.ok(current.today.some((s) => s.title === "Reminder 保留"));
  assert.ok(current.today.some((s) => s.title === "Memo 保留"));
  assert.ok(
    current.today.every(
      (s) => !s.title.includes("未来") && !s.title.includes("Unscheduled"),
    ),
  );
  assert.equal(
    await page
      .getByRole("region", { name: "当前注意力 · Current Vector" })
      .locator("button,input")
      .count(),
    0,
  );
  await page.screenshot({ path: join(output, "v0-today.png"), fullPage: true });
  checks.push(
    "PWB-002 AC-08..13/17 normal UI information CRUD, future filtering, Unscheduled exclusion, Week navigation/edit reflected Month/Today, moved acknowledgement isolation",
  );
  const expected = await state(),
    backup = join(userData, "full-v0.sqlite");
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, backup);
  await button("备份数据").click();
  await page.getByRole("status").filter({ hasText: "备份已保存" }).waitFor();
  await plan();
  await button("删除 Memo Memo 保留").click();
  await button("确认删除信息").click();
  await information().waitFor({ state: "hidden" });
  assert.equal((await state()).memos.length, expected.memos.length - 1);
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [path],
    });
    dialog.showMessageBox = async () => ({
      response: 1,
      checkboxChecked: false,
    });
  }, backup);
  await button("从备份恢复").click();
  await page.getByRole("status").filter({ hasText: "已恢复" }).waitFor();
  assert.deepEqual(await state(), expected);
  checks.push(
    "PWB-002 AC-16/18 packaged full-V0 snapshot and validated restore preserve complete identities/links/exceptions/ack; native backup pickers stubbed only",
  );
  return expected;
}
