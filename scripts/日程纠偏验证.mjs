/* global window */
import assert from "node:assert/strict";
import { join } from "node:path";

/** 与原 packaged 回归共用真实页面/API，测试数据只通过可见 UI 创建和修改。 */
export async function verifyCorrection(page, today, output, checks) {
  const date = `${today.slice(0, 8)}${today.slice(-2) === "15" ? "16" : "15"}`;
  const cell = page.getByRole("button", {
    name: `选择日期 ${date}`,
    exact: true,
  });
  const detail = page.getByRole("dialog", {
    name: `${date} 的日程`,
    exact: true,
  });
  const state = () => page.evaluate(() => window.workbench.view());
  const original = await state();
  assert.equal(await page.getByRole("heading", { name: /的日程$/ }).count(), 0);
  await cell.click();
  await detail.waitFor();
  assert.equal(await detail.locator("article").count(), 0);
  async function save() {
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page
      .locator("dialog:has(#editor-title)")
      .waitFor({ state: "hidden" });
  }
  async function create(title) {
    await detail.getByRole("button", { name: "新建日程", exact: true }).click();
    assert.equal(
      await page.getByLabel("日期", { exact: true }).inputValue(),
      date,
    );
    await page.getByLabel("标题", { exact: true }).fill(title);
    await save();
  }
  await create("甲日程");
  await create("乙日程");
  await create("丙日程");
  await detail
    .getByRole("button", { name: "编辑日程 甲日程", exact: true })
    .click();
  await page.getByLabel("标题", { exact: true }).fill("甲日程已调整");
  await page.getByLabel("开始时间", { exact: true }).fill("13:00");
  await page.getByLabel("结束时间", { exact: true }).fill("14:00");
  await save();
  await detail.getByText("13:00 — 14:00", { exact: true }).waitFor();
  assert.equal(await detail.locator("article").count(), 3);
  assert.equal(
    await detail.getByText("会计练习已调整", { exact: true }).count(),
    0,
  );
  await page.screenshot({ path: join(output, "uat-day-detail.png") });
  await detail.getByRole("button", { name: "关闭当天详情" }).click();
  assert.deepEqual(
    (await cell.locator("span").allTextContents()).sort(),
    ["乙日程", "丙日程", "甲日程已调整"].sort(),
  );
  assert.doesNotMatch(await cell.innerText(), /\d\d:\d\d/);
  assert.equal(await page.getByRole("heading", { name: /的日程$/ }).count(), 0);
  await page.screenshot({
    path: join(output, "uat-month.png"),
    fullPage: true,
  });
  checks.push(
    "UAT-AC-01/02 title-first timed cells; day-only GUI create/list/edit; no persistent day list on Plan",
  );
  await cell.click({ button: "right" });
  assert.deepEqual(await page.getByRole("menuitem").allTextContents(), [
    "新建日程",
    "编辑日程",
    "清空日程",
  ]);
  await page.screenshot({ path: join(output, "uat-context-menu.png") });
  await page.getByRole("menuitem", { name: "编辑日程", exact: true }).click();
  await detail.waitFor();
  assert.equal(await page.locator("#editor-title").count(), 0);
  assert.equal(await detail.locator("article").count(), 3);
  await detail
    .getByRole("button", { name: "删除日程 丙日程", exact: true })
    .click();
  await detail.getByRole("button", { name: "确认删除", exact: true }).click();
  await detail.getByRole("button", { name: "新建日程", exact: true }).waitFor();
  assert.deepEqual(
    (await state()).items
      .filter((i) => i.date === date)
      .map((i) => i.title)
      .sort(),
    ["乙日程", "甲日程已调整"].sort(),
  );
  await create("丙日程");
  await detail
    .getByRole("checkbox", { name: "选择日程 甲日程已调整", exact: true })
    .check();
  await detail
    .getByRole("checkbox", { name: "选择日程 乙日程", exact: true })
    .check();
  await detail
    .getByRole("button", { name: "删除所选（2）", exact: true })
    .click();
  await detail.getByRole("button", { name: "确认删除", exact: true }).click();
  await detail.getByRole("button", { name: "新建日程", exact: true }).waitFor();
  let current = await state();
  assert.deepEqual(
    current.items.filter((i) => i.date === date).map((i) => i.title),
    ["丙日程"],
  );
  assert.deepEqual(
    current.items.filter((i) => i.date !== date),
    original.items,
  );
  assert.deepEqual(current.vectors, original.vectors);
  checks.push(
    "UAT-AC-02/03/04 single delete, multi-item edit chooser and exact same-day selected deletion; unselected/other-day/Vector preserved",
  );
  await detail.getByRole("button", { name: "关闭当天详情" }).click();
  await cell.click({ button: "right" });
  await page.getByRole("menuitem", { name: "清空日程", exact: true }).click();
  const beforeCancel = await state();
  await detail
    .getByRole("heading", { name: `清空 ${date} 的全部日程？`, exact: true })
    .waitFor();
  await detail.getByRole("button", { name: "取消删除" }).click();
  assert.deepEqual(await state(), beforeCancel);
  await detail.getByRole("button", { name: "关闭当天详情" }).click();
  await cell.click({ button: "right" });
  await page.getByRole("menuitem", { name: "清空日程", exact: true }).click();
  await detail.getByRole("button", { name: "确认删除" }).click();
  await detail.getByText("这一天还没有安排。", { exact: true }).waitFor();
  current = await state();
  assert.deepEqual(current, original);
  await detail.getByRole("button", { name: "关闭当天详情" }).click();
  await cell.click({ button: "right" });
  await page.getByRole("menuitem", { name: "新建日程", exact: true }).click();
  assert.equal(
    await page.getByLabel("日期", { exact: true }).inputValue(),
    date,
  );
  await page.getByLabel("标题", { exact: true }).fill("右键新建");
  await save();
  await cell.getByText("右键新建", { exact: true }).waitFor();
  await cell.click();
  await detail
    .getByRole("checkbox", { name: "选择日程 右键新建", exact: true })
    .check();
  await detail
    .getByRole("button", { name: "编辑日程 右键新建", exact: true })
    .click();
  await page.getByLabel("日期", { exact: true }).fill(today);
  await save();
  assert.equal(
    await detail
      .getByRole("button", { name: "删除所选（0）", exact: true })
      .isDisabled(),
    true,
  );
  await detail.getByText("这一天还没有安排。", { exact: true }).waitFor();
  await detail.getByRole("button", { name: "关闭当天详情" }).click();
  await page
    .getByRole("button", { name: `选择日期 ${today}`, exact: true })
    .click();
  const otherDetail = page.getByRole("dialog", {
    name: `${today} 的日程`,
    exact: true,
  });
  await otherDetail
    .getByRole("button", { name: "删除日程 右键新建", exact: true })
    .click();
  await otherDetail.getByRole("button", { name: "确认删除" }).click();
  await otherDetail
    .getByRole("button", { name: "新建日程", exact: true })
    .waitFor();
  await otherDetail.getByRole("button", { name: "关闭当天详情" }).click();
  assert.deepEqual(await state(), original);
  checks.push(
    "UAT-AC-03 clear cancel unchanged; confirm only clicked date; right-click create date context and explicit edit-date movement",
  );
  await page.getByRole("button", { name: "Today 今日信息" }).click();
  const vector = page.getByRole("region", {
    name: "当前注意力 · Current Vector",
    exact: true,
  });
  await vector
    .getByRole("heading", { name: "专注 CPA", exact: true })
    .waitFor();
  assert.equal(await vector.locator("button,input,[role=button]").count(), 0);
  assert.doesNotMatch(await vector.innerText(), /今日确认|已完成/);
  const todayState = await state();
  const projected = todayState.today.find((s) => s.kind === "vector");
  assert.equal("acknowledged" in projected, false);
  assert.equal(
    projected.title,
    todayState.vectors.find((v) => v.id === projected.id).content,
  );
  assert.equal(await page.getByRole("checkbox").count(), 1);
  assert.equal(await page.getByRole("checkbox").isChecked(), true);
  await page.screenshot({
    path: join(output, "uat-today-vector.png"),
    fullPage: true,
  });
  checks.push(
    "UAT-AC-05/06 distinct read-only Today Vector derived from Plan; Scheduled Item acknowledgement unchanged",
  );
  await page.getByRole("button", { name: "Plan 未来安排" }).click();
}
