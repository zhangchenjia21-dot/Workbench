import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openWorkbench } from "../src/个人状态/L3_外交层/状态公开接口";
import {
  dateOnly,
  localDate,
  overlaps,
  type TrackDraft,
} from "../src/个人状态/L0_公理层/状态契约";
export const track: TrackDraft = {
  name: "CPA",
  goal: "通过考试",
  phase: "会计",
  realState: "完成第一章",
  direction: "练习",
  status: "Active",
};
test("日期严格按日历校验，不进行 UTC 转换", () => {
  for (const date of ["2024-02-29", "2026-12-31", "0001-01-01"]) dateOnly(date);
  for (const date of [
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "0000-01-01",
    "2026-09-06T00:00:00Z",
  ])
    assert.throws(() => dateOnly(date));
  assert.equal(localDate(new Date(2026, 8, 6, 23, 59)), "2026-09-06");
  assert.equal(
    overlaps(
      { content: "a", startDate: "2026-09-01", endDate: "2026-09-06" },
      { content: "b", startDate: "2026-09-06", endDate: "2026-09-08" },
    ),
    true,
  );
});
test("稳定身份、生命周期、单次日程编辑与改名关联", () =>
  withApp((app) => {
    const id = app.saveTrack(null, track);
    const item = app.saveItem(null, {
      title: "练习",
      date: "2026-09-06",
      startTime: "09:00",
      endTime: "10:00",
      trackId: id,
    });
    for (const status of ["Completed", "Archived", "Active"] as const)
      app.saveTrack(id, { ...track, name: "CPA 改名", status });
    app.saveItem(item, {
      title: "会计练习",
      date: "2026-09-07",
      startTime: "10:00",
      endTime: "11:00",
      trackId: id,
    });
    const view = app.view("2026-09-07");
    assert.equal(view.tracks[0].id, id);
    assert.equal(view.items[0].trackId, id);
    assert.equal(view.items[0].id, item);
    assert.match(view.today[0].detail, /CPA 改名/);
    assert.throws(() => app.saveTrack("missing", track));
    assert.throws(() =>
      app.saveItem(null, { ...view.items[0], trackId: "missing" }),
    );
    assert.throws(() =>
      app.saveItem(null, { ...view.items[0], endTime: "09:00" }),
    );
    assert.equal(app.view().items.length, 1);
  }));
test("Vector create/edit 包含端点拒绝，失败后 canonical 不变", () =>
  withApp((app) => {
    const a = app.saveVector(null, {
      content: "A",
      startDate: "2026-09-01",
      endDate: "2026-09-06",
    });
    const b = app.saveVector(null, {
      content: "B",
      startDate: "2026-09-07",
      endDate: "2026-09-10",
    });
    const before = app.view("2026-09-06");
    assert.throws(
      () =>
        app.saveVector(null, {
          content: "C",
          startDate: "2026-09-06",
          endDate: "2026-09-06",
        }),
      /重叠/,
    );
    assert.throws(
      () =>
        app.saveVector(b, {
          content: "B changed",
          startDate: "2026-09-06",
          endDate: "2026-09-10",
        }),
      /重叠/,
    );
    assert.deepEqual(app.view("2026-09-06"), before);
    app.saveVector(a, {
      content: "A edited",
      startDate: "2026-09-01",
      endDate: "2026-09-06",
    });
    assert.equal(app.view("2026-09-06").today[0].title, "A edited");
  }));
test("Today 精确投影与 acknowledgement 隔离", () =>
  withApp((app) => {
    const id = app.saveTrack(null, track);
    const vector = app.saveVector(null, {
      content: "今天方向",
      startDate: "2026-09-01",
      endDate: "2026-09-06",
    });
    const item = app.saveItem(null, {
      title: "今天",
      date: "2026-09-06",
      startTime: "09:00",
      endTime: "10:00",
      trackId: id,
    });
    app.saveItem(null, {
      title: "明天",
      date: "2026-09-07",
      startTime: "09:00",
      endTime: "10:00",
      trackId: null,
    });
    const before = app.view("2026-09-06");
    assert.deepEqual(
      before.today.map((s) => s.id),
      [vector, item],
    );
    app.acknowledge("2026-09-06", `item:${item}`, true);
    assert.throws(() =>
      app.acknowledge("2026-09-06", `vector:${vector}`, true),
    );
    const after = app.view("2026-09-06");
    assert.deepEqual(after.items, before.items);
    assert.deepEqual(after.tracks, before.tracks);
    assert.deepEqual(after.vectors, before.vectors);
    assert.equal("acknowledged" in after.today[0], false);
    assert.ok(
      after.today.filter((s) => s.kind === "item").every((s) => s.acknowledged),
    );
    assert.equal(app.view("2026-09-07").today.length, 1);
    assert.equal(
      app.view("2026-09-07").today.find((s) => s.kind === "item")!.acknowledged,
      false,
    );
    assert.throws(() => app.acknowledge("2026-09-07", `item:${item}`, true));
    app.acknowledge("2026-09-06", `item:${item}`, false);
    assert.equal(
      app.view("2026-09-06").today.find((s) => s.kind === "item")!.acknowledged,
      false,
    );
  }));
function withApp(work: (app: ReturnType<typeof openWorkbench>) => void) {
  const dir = mkdtempSync(join(tmpdir(), "pwb-domain-"));
  const app = openWorkbench(join(dir, "state.sqlite"));
  try {
    work(app);
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
}

test("当天删除严格限定选择与日期，整批拒绝跨日或过期 ID", () =>
  withApp((app) => {
    const date = "2026-09-06";
    const trackId = app.saveTrack(null, track);
    app.saveVector(null, { content: "方向", startDate: date, endDate: date });
    const create = (title: string, day = date) =>
      app.saveItem(null, {
        title,
        date: day,
        startTime: "09:00",
        endTime: "10:00",
        trackId,
      });
    const a = create("A"),
      b = create("B"),
      c = create("C"),
      other = create("其它日期", "2026-09-07");
    app.acknowledge(date, `item:${c}`, true);
    const before = app.view(date);
    assert.throws(() => app.deleteItems(date, [a, other]), /非当天/);
    assert.throws(() => app.deleteItems(date, [a, "missing"]), /非当天/);
    assert.deepEqual(app.view(date), before);
    app.deleteItems(date, [a, b]);
    assert.deepEqual(
      app
        .view(date)
        .items.map((i) => i.id)
        .sort(),
      [c, other].sort(),
    );
    assert.deepEqual(app.view(date).tracks, before.tracks);
    assert.deepEqual(app.view(date).vectors, before.vectors);
    assert.equal(
      app.view(date).today.find((s) => s.kind === "item")!.acknowledged,
      true,
    );
    app.deleteItems(date, null);
    assert.deepEqual(
      app.view(date).items.map((i) => i.id),
      [other],
    );
    assert.deepEqual(app.view(date).vectors, before.vectors);
  }));
