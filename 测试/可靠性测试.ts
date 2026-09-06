import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  openWorkbench,
  expandOccurrences,
} from "../src/个人状态/L3_外交层/状态公开接口";
import {
  connect,
  validateDatabase,
} from "../src/个人状态/L1_器件层/数据库结构";
const date = "2026-09-06",
  next = "2026-09-07",
  key = `${date}T09:00`;
const seriesDraft = {
  title: "循环",
  startDate: date,
  endDate: next,
  startTime: "09:00",
  endTime: "10:00",
  pattern: "daily" as const,
  weekdays: [],
  trackId: null,
};
const itemDraft = {
  title: "事项",
  date,
  startTime: "09:00",
  endTime: "10:00",
  trackId: null,
};
const trackDraft = {
  name: "CPA",
  goal: "考试",
  phase: "会计",
  realState: "第一章",
  direction: "练习",
  status: "Active" as const,
};
function rows(path: string) {
  const db = connect(path, true);
  try {
    validateDatabase(db);
    return db
      .prepare("SELECT * FROM acknowledgements ORDER BY date,sourceId")
      .all()
      .map((r) => ({ ...r }));
  } finally {
    db.close();
  }
}

test("PWB-003 A-01 删除 occurrence 后重启/恢复/公开重编辑不复活旧确认", () => {
  const dir = mkdtempSync(join(tmpdir(), "pwb-stale-")),
    path = join(dir, "live.sqlite");
  let app = openWorkbench(path);
  try {
    const id = app.saveSeries(null, seriesDraft),
      source = `occurrence:${id}@${key}`;
    const other = app.saveSeries(null, { ...seriesDraft, title: "无关循环" });
    const single = app.saveItem(null, itemDraft);
    app.acknowledge(date, source, true);
    app.acknowledge(date, `occurrence:${other}@${key}`, true);
    app.acknowledge(next, `occurrence:${id}@${next}T09:00`, true);
    app.acknowledge(date, `item:${single}`, true);
    app.saveException(id, key, null);
    const residual = rows(path).filter((r) => r.sourceId === source).length;
    for (const [from, to] of [
      [date, date],
      ["2026-09-01", "2026-09-30"],
      ["2026-08-31", date],
    ]) {
      const v = app.view(date);
      assert.ok(
        !expandOccurrences(v.series, v.exceptions, from, to).some(
          (o) => o.id === `${id}@${key}`,
        ),
      );
    }
    assert.ok(!app.view(date).today.some((o) => o.id === `${id}@${key}`));
    app.close();
    app = openWorkbench(path);
    app.backup(join(dir, "backup.sqlite"));
    app.restore(join(dir, "backup.sqlite"));
    assert.ok(!app.view(date).today.some((o) => o.id === `${id}@${key}`));
    // 现有公开命令接受此 key；GUI 没有复活按钮，不把 API 路径冒充鼠标路径。
    app.saveException(id, key, { ...itemDraft, title: "公开命令重编辑" });
    const revived = app.view(date).today.find((o) => o.id === `${id}@${key}`)!;
    console.log(
      JSON.stringify({
        audit: "A-01",
        residualAfterDelete: residual,
        reeditAcknowledged: revived.acknowledged,
        publicCommandAccepted: true,
      }),
    );
    assert.equal(revived.acknowledged, false, "删除边界之前的确认不能重新生效");
    assert.equal(residual, 0);
    assert.equal(
      rows(path).length,
      3,
      "保留其它日期 occurrence、其它 series 和 item 确认",
    );
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
});

test("PWB-003 A-01 旧快照 tombstone 的历史确认在重编辑时被精确清除且失败原子回滚", () => {
  const dir = mkdtempSync(join(tmpdir(), "pwb-legacy-ack-")),
    path = join(dir, "live.sqlite");
  let app = openWorkbench(path);
  try {
    const id = app.saveSeries(null, seriesDraft),
      source = `occurrence:${id}@${key}`;
    app.saveException(id, key, null);
    app.close();
    const db = connect(path);
    db.prepare("INSERT INTO acknowledgements VALUES(?,?,1)").run(date, source);
    db.close();
    app = openWorkbench(path);
    app.backup(join(dir, "old.sqlite"));
    app.restore(join(dir, "old.sqlite"));
    const before = app.view(date);
    assert.throws(() =>
      app.saveException(id, key, { ...itemDraft, trackId: "missing" }),
    );
    assert.deepEqual(app.view(date), before);
    assert.equal(rows(path).length, 1);
    app.saveException(id, key, itemDraft);
    assert.equal(app.view(date).today[0].acknowledged, false);
    assert.equal(rows(path).length, 0);
    app.acknowledge(date, source, true);
    app.saveException(id, key, { ...itemDraft, title: "普通编辑" });
    assert.equal(
      app.view(date).today[0].acknowledged,
      true,
      "未删除的同身份普通编辑保持既有语义",
    );
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
});

test("PWB-003 A-02..07 五轮独立期望模型，每轮 22 状态操作及三范围投影", () => {
  const dir = mkdtempSync(join(tmpdir(), "pwb-sequence-")),
    path = join(dir, "live.sqlite");
  let app = openWorkbench(path),
    transitions = 0;
  try {
    const trackId = app.saveTrack(null, trackDraft);
    app.saveVector(null, { content: "方向", startDate: date, endDate: next });
    const baseline = app.view(date);
    for (let round = 0; round < 5; round++) {
      const draft = {
        ...seriesDraft,
        trackId,
        pattern: round % 2 ? ("weekly" as const) : ("daily" as const),
        weekdays: round % 2 ? [1, 7] : [],
      };
      const id = app.saveSeries(null, draft);
      transitions++;
      const source = `occurrence:${id}@${key}`,
        nextSource = `occurrence:${id}@${next}T09:00`;
      let title = draft.title;
      let mode: "normal" | "moved" | "deleted" = "normal";
      const expectedAck = new Map<string, number>();
      // 期望发生实例用两个明确日期构造，不调用生产展开器计算 oracle。
      function check() {
        const v = app.view(date);
        assert.deepEqual(v.tracks, baseline.tracks);
        assert.deepEqual(v.vectors, baseline.vectors);
        assert.equal(v.series.length, 1);
        assert.deepEqual(v.series[0], { ...draft, id, title });
        assert.equal(v.exceptions.length, mode === "normal" ? 0 : 1);
        if (mode !== "normal")
          assert.deepEqual(v.exceptions[0], {
            seriesId: id,
            originalKey: key,
            deleted: mode === "deleted",
            ...(mode === "deleted"
              ? {
                  title: null,
                  date: null,
                  startTime: null,
                  endTime: null,
                  trackId: null,
                }
              : {
                  title: "移动",
                  date: next,
                  startTime: "15:00",
                  endTime: "16:00",
                  trackId,
                }),
          });
        const expected = [
          ...(mode === "deleted"
            ? []
            : [
                {
                  id: `${id}@${key}`,
                  date: mode === "moved" ? next : date,
                  title: mode === "moved" ? "移动" : title,
                  startTime: mode === "moved" ? "15:00" : "09:00",
                },
              ]),
          { id: `${id}@${next}T09:00`, date: next, title, startTime: "09:00" },
        ];
        for (const day of [date, next]) {
          const daily = app.view(day);
          const wanted = expected
            .filter((o) => o.date === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          for (const [from, to] of [
            ["2026-09-01", "2026-09-30"],
            ["2026-09-06", "2026-09-12"],
            [day, day],
          ]) {
            const actual = expandOccurrences(
              daily.series,
              daily.exceptions,
              from,
              to,
            ).filter((o) => o.date === day);
            assert.deepEqual(
              actual.map((o) => ({
                id: o.id,
                date: o.date,
                title: o.title,
                startTime: o.startTime,
              })),
              wanted,
            );
          }
          assert.deepEqual(
            daily.today
              .filter((o) => o.kind === "occurrence")
              .map((o) => ({
                id: o.id,
                title: o.title,
                acknowledged: o.acknowledged,
              })),
            wanted.map((o) => ({
              id: o.id,
              title: o.title,
              acknowledged: expectedAck.get(`${day}|occurrence:${o.id}`) === 1,
            })),
          );
          assert.ok(
            daily.today.every((o) => o.kind !== ("unscheduled" as string)),
          );
          assert.ok(
            daily.today
              .filter((o) => ["vector", "reminder", "memo"].includes(o.kind))
              .every((o) => !("acknowledged" in o)),
          );
        }
        assert.deepEqual(
          rows(path),
          [...expectedAck]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, acknowledged]) => ({
              date: k.split("|")[0],
              sourceId: k.split("|")[1],
              acknowledged,
            })),
        );
      }
      check();
      app.acknowledge(date, source, true);
      transitions++;
      expectedAck.set(`${date}|${source}`, 1);
      check();
      app.saveException(id, key, {
        ...itemDraft,
        title: "移动",
        date: next,
        startTime: "15:00",
        endTime: "16:00",
        trackId,
      });
      transitions++;
      mode = "moved";
      check();
      app.acknowledge(next, source, true);
      transitions++;
      expectedAck.set(`${next}|${source}`, 1);
      check();
      app.acknowledge(next, nextSource, true);
      transitions++;
      expectedAck.set(`${next}|${nextSource}`, 1);
      check();
      app.saveException(id, key, null);
      transitions++;
      mode = "deleted";
      expectedAck.delete(`${date}|${source}`);
      expectedAck.delete(`${next}|${source}`);
      check();
      const before = app.view(next);
      assert.throws(
        () => app.saveSeries(id, { ...draft, title: "整循环" }),
        /清除/,
      );
      transitions++;
      assert.deepEqual(app.view(next), before);
      check();
      app.saveSeries(id, { ...draft, title: "整循环" }, true);
      transitions++;
      title = "整循环";
      mode = "normal";
      expectedAck.clear();
      check();
      const item = app.saveItem(null, { ...itemDraft, trackId });
      transitions++;
      app.acknowledge(date, `item:${item}`, true);
      transitions++;
      expectedAck.set(`${date}|item:${item}`, 1);
      check();
      app.saveItem(item, {
        ...itemDraft,
        title: "移动单次",
        date: next,
        trackId,
      });
      transitions++;
      check();
      assert.equal(
        app.view(date).today.filter((o) => o.kind === "item").length,
        0,
      );
      assert.equal(
        app.view(next).today.find((o) => o.kind === "item")!.acknowledged,
        false,
      );
      const r = app.saveReminder(null, { content: "提醒", date, time: null });
      transitions++;
      const m = app.saveMemo(null, { content: "备忘", date: next });
      transitions++;
      const u = app.saveUnscheduled(null, { content: "未定", trackId });
      transitions++;
      check();
      assert.deepEqual(
        app
          .view(date)
          .today.filter((o) => ["reminder", "memo"].includes(o.kind))
          .map((o) => o.id),
        [r],
      );
      assert.deepEqual(
        app
          .view(next)
          .today.filter((o) => ["reminder", "memo"].includes(o.kind))
          .map((o) => o.id),
        [m],
      );
      const graph = [app.view(date), app.view(next)];
      app.close();
      app = openWorkbench(path);
      transitions++;
      assert.deepEqual([app.view(date), app.view(next)], graph);
      check();
      const backup = join(dir, `round-${round}.sqlite`);
      app.backup(backup);
      transitions++;
      const independent = openWorkbench(backup);
      assert.deepEqual([independent.view(date), independent.view(next)], graph);
      independent.close();
      app.deleteInformation("reminder", r);
      transitions++;
      assert.ok(!app.view(date).today.some((o) => o.id === r));
      app.restore(backup);
      transitions++;
      assert.deepEqual([app.view(date), app.view(next)], graph);
      check();
      app.deleteItems(next, [item]);
      transitions++;
      expectedAck.clear();
      check();
      for (const [kind, entity] of [
        ["reminder", r],
        ["memo", m],
        ["unscheduled", u],
      ] as const) {
        app.deleteInformation(kind, entity);
        transitions++;
      }
      app.deleteSeries(id);
      transitions++;
      assert.deepEqual(app.view(date), baseline);
      assert.deepEqual(rows(path), []);
    }
    assert.equal(transitions, 115);
    console.log(
      JSON.stringify({
        audit: "A-02..07",
        rounds: 5,
        transitions,
        final: "baseline canonical graph and zero ack rows",
        integrity: "ok",
      }),
    );
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
});

test("PWB-003 A-05 完整九表未提交进程中断后 graph 与确认全部回滚", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pwb-full-crash-")),
    path = join(dir, "live.sqlite");
  let app = openWorkbench(path);
  try {
    const trackId = app.saveTrack(null, trackDraft);
    const id = app.saveSeries(null, { ...seriesDraft, trackId });
    const item = app.saveItem(null, { ...itemDraft, trackId });
    app.saveVector(null, { content: "方向", startDate: date, endDate: next });
    app.saveException(id, key, { ...itemDraft, title: "例外", trackId });
    app.saveReminder(null, { content: "提醒", date, time: null });
    app.saveMemo(null, { content: "备忘", date });
    app.saveUnscheduled(null, { content: "未定", trackId });
    app.acknowledge(date, `occurrence:${id}@${key}`, true);
    app.acknowledge(date, `item:${item}`, true);
    const expected = [app.view(date), app.view(next)],
      ack = rows(path);
    app.close();
    const sql =
      "BEGIN IMMEDIATE; UPDATE tracks SET name='uncommitted'; UPDATE items SET title='uncommitted'; UPDATE vectors SET content='uncommitted'; UPDATE series SET title='uncommitted'; UPDATE exceptions SET title='uncommitted'; UPDATE reminders SET content='uncommitted'; UPDATE memos SET content='uncommitted'; UPDATE unscheduled SET content='uncommitted'; DELETE FROM acknowledgements;";
    const child = spawn(
      process.execPath,
      [
        "-e",
        `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1]);db.exec(process.argv[2]);process.stdout.write('READY');setInterval(()=>{},1000);`,
        path,
        sql,
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.once("data", () => resolve());
        child.once("error", reject);
        child.once("exit", (code) => reject(Error(`premature exit ${code}`)));
      });
      // 事务仍存活时另一只读连接也不能观察部分 graph。
      const observer = openWorkbench(path);
      assert.deepEqual([observer.view(date), observer.view(next)], expected);
      observer.close();
    } finally {
      const ended = new Promise<void>((resolve) =>
        child.once("exit", () => resolve()),
      );
      child.kill("SIGKILL");
      await ended;
    }
    app = openWorkbench(path);
    assert.deepEqual([app.view(date), app.view(next)], expected);
    assert.deepEqual(rows(path), ack);
  } finally {
    app.close();
    rmSync(dir, { recursive: true });
  }
});
