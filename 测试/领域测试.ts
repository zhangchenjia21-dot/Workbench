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

test("PWB-002 daily/weekly 动态展开、inclusive 边界与无结束循环", async () => {
  const { expandOccurrences } = await import(
    "../src/个人状态/L3_外交层/状态公开接口"
  );
  const s = {
    id: "series",
    title: "09:00",
    startDate: "2026-03-06",
    endDate: "2026-03-10",
    startTime: "09:00",
    endTime: "10:00",
    trackId: null,
    pattern: "daily" as const,
    weekdays: [],
  };
  assert.deepEqual(
    expandOccurrences([s], [], "2026-03-01", "2026-03-12").map((o) => o.date),
    ["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"],
  );
  assert.deepEqual(
    expandOccurrences(
      [{ ...s, pattern: "weekly", weekdays: [1, 3, 7], endDate: null }],
      [],
      "2026-03-06",
      "2026-03-12",
    ).map((o) => o.date),
    ["2026-03-08", "2026-03-09", "2026-03-11"],
  );
  assert.equal(
    expandOccurrences([s], [], "2026-03-11", "2026-03-12").length,
    0,
  );
});
test("PWB-002 移动原身份、仅一次删除、确认隔离、整循环警告与清除策略", () =>
  withApp((app) => {
    const d = {
      title: "循环",
      startDate: "2026-09-01",
      endDate: null,
      startTime: "09:00",
      endTime: "10:00",
      trackId: app.saveTrack(null, track),
      pattern: "daily" as const,
      weekdays: [],
    };
    const id = app.saveSeries(null, d),
      other = app.saveSeries(null, { ...d, title: "其它循环" });
    const value = {
      title: "移到后天",
      date: "2026-09-08",
      startTime: "15:00",
      endTime: "16:00",
      trackId: d.trackId,
    };
    app.saveException(id, "2026-09-06T09:00", value);
    app.saveException(id, "2026-09-07T09:00", null);
    assert.equal(
      app.view("2026-09-06").today.filter((s) => s.title === d.title).length,
      0,
    );
    const moved = app
      .view(value.date)
      .today.find((s) => s.title === value.title)!;
    assert.equal(moved.id, `${id}@2026-09-06T09:00`);
    const before = app.view(value.date);
    app.acknowledge(value.date, `occurrence:${moved.id}`, true);
    const after = app.view(value.date);
    assert.deepEqual(after.series, before.series);
    assert.deepEqual(after.exceptions, before.exceptions);
    assert.deepEqual(after.tracks, before.tracks);
    assert.equal(
      after.today.find(
        (s) => s.kind === "occurrence" && s.id === moved.id && s.acknowledged,
      )?.id,
      moved.id,
    );
    assert.throws(() =>
      app.acknowledge("2026-09-06", `occurrence:${moved.id}`, true),
    );
    assert.throws(() => app.saveException(id, "2026-09-06T08:00", value));
    assert.throws(() => app.saveSeries(id, { ...d, title: "新规则" }), /清除/);
    assert.deepEqual(app.view(value.date), after);
    app.saveSeries(id, { ...d, title: "新规则", startTime: "08:00" }, true);
    assert.equal(app.view(value.date).exceptions.length, 0);
    assert.equal(
      app.view(value.date).series.find((s) => s.id === id)!.title,
      "新规则",
    );
    app.saveException(id, "2026-09-06T08:00", null);
    app.deleteSeries(id);
    assert.equal(app.view(value.date).exceptions.length, 0);
    assert.deepEqual(
      app.view(value.date).series.map((s) => s.id),
      [other],
    );
  }));
test("PWB-002 信息对象稳定身份与精确 Today projection", () =>
  withApp((app) => {
    const date = "2026-09-06";
    const r = app.saveReminder(null, { content: "今天提醒", date, time: null });
    const m = app.saveMemo(null, { content: "今天备忘", date });
    const u = app.saveUnscheduled(null, { content: "近期未定", trackId: null });
    app.saveReminder(null, {
      content: "未来提醒",
      date: "2026-09-07",
      time: "09:00",
    });
    app.saveMemo(null, { content: "未来备忘", date: "2026-09-07" });
    app.saveReminder(r, { content: "今天提醒已改", date, time: "10:00" });
    app.saveMemo(m, { content: "今天备忘已改", date });
    app.saveUnscheduled(u, { content: "近期已改", trackId: null });
    const v = app.view(date);
    assert.deepEqual(
      v.today.map((s) => s.id),
      [r, m],
    );
    assert.ok(v.today.every((s) => !("acknowledged" in s)));
    for (const [kind, id] of [
      ["reminder", r],
      ["memo", m],
      ["unscheduled", u],
    ])
      assert.throws(() => app.acknowledge(date, `${kind}:${id}`, true));
    for (const kind of ["reminder", "memo", "unscheduled"] as const)
      app.deleteInformation(
        kind,
        kind === "reminder" ? r : kind === "memo" ? m : u,
      );
    assert.equal(app.view(date).today.length, 0);
    assert.equal(app.view(date).unscheduled.length, 0);
  }));
test("PWB-002 日期算术跨年/闰日及 DST 本地 wall-time 与 Today 边界", async () => {
  const { addDays, weekday } = await import(
    "../src/个人状态/L3_外交层/状态公开接口"
  );
  const { execFileSync } = await import("node:child_process");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(weekday("0001-01-01"), 1);
  // 独立进程实际切换时区；同一绝对时刻的 Today 可以不同，循环仍保留当地 09:00 字符串。
  const code = `const {localDate}=require('./src/个人状态/L0_公理层/状态契约.ts'); const {expandOccurrences}=require('./src/个人状态/L1_器件层/循环展开器.ts');
    const s={id:'s',title:'daily',startDate:'2026-03-07',endDate:'2026-03-10',startTime:'09:00',endTime:'10:00',pattern:'daily',weekdays:[],trackId:null};
    console.log(JSON.stringify({date:localDate(new Date('2026-03-08T04:30:00Z')),times:expandOccurrences([s],[],'2026-03-07','2026-03-10').map(o=>o.startTime),offsets:[new Date(2026,2,7,9).getTimezoneOffset(),new Date(2026,2,9,9).getTimezoneOffset()]}));`;
  const run = (TZ: string) =>
    JSON.parse(
      execFileSync(process.execPath, ["--require", "tsx/cjs", "-e", code], {
        env: { ...process.env, TZ },
        encoding: "utf8",
        windowsHide: true,
      }),
    );
  const ny = run("America/New_York"),
    sh = run("Asia/Shanghai");
  assert.deepEqual(ny.offsets, [300, 240]);
  assert.deepEqual(ny.times, ["09:00", "09:00", "09:00", "09:00"]);
  assert.equal(ny.date, "2026-03-07");
  assert.equal(sh.date, "2026-03-08");
});

test("PWB-002 无效规则/关联/原键拒绝，失败整循环更新保留既有例外", () =>
  withApp((app) => {
    const draft = {
      title: "有效循环",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      startTime: "09:00",
      endTime: "10:00",
      pattern: "weekly" as const,
      weekdays: [1, 3],
      trackId: null,
    };
    const id = app.saveSeries(null, draft);
    app.saveException(id, "2026-09-07T09:00", null);
    const before = app.view("2026-09-07");
    for (const d of [
      { ...draft, weekdays: [] },
      { ...draft, weekdays: [1, 1] },
      { ...draft, weekdays: [8] },
      { ...draft, endDate: "2026-08-31" },
      { ...draft, trackId: "missing" },
      { ...draft, endTime: "08:00" },
    ])
      assert.throws(() => app.saveSeries(id, d, true));
    assert.throws(() => app.saveException(id, "2026-09-08T09:00", null));
    assert.throws(() => app.saveException(id, "2026-10-05T09:00", null));
    assert.deepEqual(app.view("2026-09-07"), before);
    const single = app.saveItem(null, {
      title: "单次",
      date: "2026-09-07",
      startTime: "12:00",
      endTime: "13:00",
      trackId: null,
    });
    app.deleteItems("2026-09-07", [single]);
    assert.deepEqual(app.view("2026-09-07"), before);
    assert.throws(() =>
      app.saveReminder(null, {
        content: "提醒",
        date: "2026-09-07",
        time: "25:00",
      }),
    );
    assert.throws(() =>
      app.saveMemo(null, { content: "", date: "2026-09-07" }),
    );
    assert.deepEqual(app.view("2026-09-07"), before);
  }));
