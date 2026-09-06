/* global window */
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

/** 在既有 packaged 会话中经正常 GUI 写入；SQLite 只读核对孤立残留与完整性。 */
export async function verifyReliability(
  page,
  app,
  today,
  output,
  userData,
  proof,
) {
  const state = () => page.evaluate(() => window.workbench.view());
  const button = (name) => page.getByRole("button", { name, exact: true });
  const detail = page.getByRole("dialog", {
    name: `${today} 的日程`,
    exact: true,
  });
  const recurrence = page.locator("dialog:has(#recurrence-heading)");
  const errors = [],
    stderr = [];
  const onError = (error) => errors.push(String(error));
  const onStderr = (chunk) => stderr.push(String(chunk));
  page.on("pageerror", onError);
  app.process().stderr.on("data", onStderr);
  function canonical() {
    const db = new DatabaseSync(join(userData, "personal-state.sqlite"), {
      readOnly: true,
    });
    try {
      assert.equal(
        db.prepare("PRAGMA integrity_check").get().integrity_check,
        "ok",
      );
      assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
      return db
        .prepare("SELECT * FROM acknowledgements ORDER BY date,sourceId")
        .all()
        .map((row) => ({ ...row }));
    } finally {
      db.close();
    }
  }
  const baseline = await state(),
    acks = canonical(),
    cycles = [];
  const windowId = await app.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].id,
  );
  try {
    for (let i = 0; i < 6; i++) {
      const title = `审计循环 ${i}`,
        single = `审计单次 ${i}`;
      await button("Plan 未来安排").click();
      await button("月视图").click();
      await button("本月").click();
      await button("新建循环日程").click();
      await page.getByLabel("循环标题", { exact: true }).fill(title);
      await page.getByLabel("开始日期", { exact: true }).fill(today);
      await page.getByLabel("结束日期（可选）", { exact: true }).fill(today);
      await button("保存循环").click();
      await recurrence.waitFor({ state: "hidden" });
      const series = (await state()).series.find((s) => s.title === title);
      const source = `occurrence:${series.id}@${today}T09:00`;
      const cell = button(`选择日期 ${today}`);
      await cell.getByText(title, { exact: true }).waitFor();
      assert.doesNotMatch(await cell.innerText(), /\d\d:\d\d/);
      await cell.click();
      await detail.getByRole("heading", { name: title, exact: true }).waitFor();
      await detail
        .getByRole("button", { name: "新建日程", exact: true })
        .click();
      await page.getByLabel("标题", { exact: true }).fill(single);
      await button("保存").click();
      await page
        .locator("dialog:has(#editor-title)")
        .waitFor({ state: "hidden" });
      await detail
        .getByRole("checkbox", { name: `选择日程 ${single}`, exact: true })
        .check();
      await button("删除所选（1）").click();
      await button("确认删除").click();
      await detail
        .getByRole("button", { name: "新建日程", exact: true })
        .waitFor();
      assert.equal(await button("删除所选（0）").isDisabled(), true);
      assert.equal(
        await detail
          .getByRole("heading", { name: single, exact: true })
          .count(),
        0,
      );
      await button("关闭当天详情").click();
      assert.equal(
        await page.getByRole("heading", { name: /的日程$/ }).count(),
        0,
      );
      await button("周视图").click();
      await cell.getByText(title, { exact: false }).waitFor();
      await button("下一周").click();
      await button("上一周").click();
      await button("Today 今日信息").click();
      const card = page
        .locator("article")
        .filter({
          has: page.getByRole("heading", { name: title, exact: true }),
        });
      await card.getByRole("checkbox").check();
      assert.equal(
        canonical().filter((r) => r.sourceId === source && r.acknowledged === 1)
          .length,
        1,
      );
      const beforeDelete = await state();
      await button("Plan 未来安排").click();
      await button("月视图").click();
      await button("本月").click();
      await cell.click();
      await button(`删除循环日程 ${title}`).click();
      await button("仅这一次").click();
      await button("确认删除循环").click();
      await recurrence.waitFor({ state: "hidden" });
      assert.equal(
        await detail.getByRole("heading", { name: title, exact: true }).count(),
        0,
      );
      await button("关闭当天详情").click();
      assert.equal(await cell.getByText(title, { exact: true }).count(), 0);
      await button("周视图").click();
      assert.equal(await cell.getByText(title, { exact: false }).count(), 0);
      await button("Today 今日信息").click();
      assert.equal(
        await page.getByRole("heading", { name: title, exact: true }).count(),
        0,
      );
      assert.equal(canonical().filter((r) => r.sourceId === source).length, 0);
      assert.deepEqual((await state()).series, beforeDelete.series);
      if (i === 5)
        await page.screenshot({
          path: join(output, "hardening-today.png"),
          fullPage: true,
        });
      await button("Plan 未来安排").click();
      if (!(await page.locator("summary").evaluate(el => el.parentElement.open)))
        await page.locator("summary").click();
      await button(`删除整个循环 ${title}`).click();
      await button("确认删除循环").click();
      await recurrence.waitFor({ state: "hidden" });
      assert.deepEqual(await state(), baseline);
      assert.deepEqual(canonical(), acks);
      const hidden = await app.evaluate(({ BrowserWindow }) => {
        const windows = BrowserWindow.getAllWindows(),
          w = windows[0];
        w.close();
        return {
          count: windows.length,
          id: w.id,
          visible: w.isVisible(),
          destroyed: w.isDestroyed(),
          tray: !globalThis.pwbLifecycle.tray.isDestroyed(),
        };
      });
      assert.deepEqual(hidden, {
        count: 1,
        id: windowId,
        visible: false,
        destroyed: false,
        tray: true,
      });
      assert.equal(app.process().exitCode, null);
      await app.evaluate(
        (_, event) => globalThis.pwbLifecycle.tray.emit(event),
        i % 2 ? "double-click" : "click",
      );
      await page.waitForFunction(() => document.hasFocus());
      const restored = await app.evaluate(({ BrowserWindow }) => {
        const windows = BrowserWindow.getAllWindows(),
          w = windows[0];
        return {
          count: windows.length,
          id: w.id,
          visible: w.isVisible(),
          focused: w.isFocused(),
        };
      });
      assert.deepEqual(restored, {
        count: 1,
        id: windowId,
        visible: true,
        focused: true,
      });
      assert.deepEqual(await state(), baseline);
      cycles.push({ iteration: i + 1, hidden, restored });
    }
    await page.screenshot({
      path: join(output, "hardening-plan.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    assert.doesNotMatch(stderr.join(""), /uncaught|unhandled|FATAL/i);
    proof.hardening = {
      sessionIterations: 6,
      guiMutations: 36,
      cycles,
      finalGraph: "deepEqual complete V0 baseline",
      finalAcknowledgements: "exact baseline rows",
      integrity: "ok",
      pageErrors: errors,
      stderr,
    };
    proof.checks.push(
      "PWB-003 H-AC-02/06/07/08 6 same-session normal GUI create/ack/single-delete/whole-delete and selected item delete; Month/Week/Today agree; exact canonical/ack baseline each round",
    );
    proof.checks.push(
      "PWB-003 H-AC-09 6 close-hide/process-alive/real Tray click or double-click handler/restore-focus cycles, same window id and count=1; followed by existing real Exit code 0 and restart",
    );
  } finally {
    page.off("pageerror", onError);
    app.process().stderr.off("data", onStderr);
  }
}
