# 05 Independent Re-review｜PWB-001 UAT-C1

Status: **PASS**  
Review target: `7043aaf62c245f60a19920df59e8d634970b627c`  
Correction implementation: `629bf1ce9515590ac21f6a6c2d13913df1c0825d`  
Correction base after Addendum: `b3c286ef244cf52c5603a6cbfb99432da50071af`  
Prior accepted PWB-001 review baseline: `0eb31cf72c3f2db1674edf664c8ba1011f91cdb8`

> This is an Independent Review record. Builder Completion/Acceptance claims were treated as leads only, not acceptance evidence.

## Evidence independently reviewed

- `docs/tasks/PWB-001/TASK.md`
- `docs/tasks/PWB-001/UAT_CORRECTION_ADDENDUM.md`
- `docs/tasks/PWB-001/UAT_CORRECTION_COMPLETION.md`
- prior accepted PWB-001 baseline → correction implementation → exact final HEAD commit ancestry/diffs
- corrected domain/state/API/UI implementation
- focused domain + persistence tests
- packaged Playwright correction assertions and original packaged regression
- Windows Actions run `34027885631` on implementation SHA
- exact-final-HEAD Windows Actions run `34028136013` on `7043aaf...`
- branch head and no production changes in the Completion/evidence commit

## Independent acceptance

| Gate | Result | Independent basis |
|---|---|---|
| UAT-AC-01 Month event-first | PASS | Month cells render item title only; time remains in day detail/editor; packaged assertion rejects HH:mm in cell. |
| UAT-AC-02 Left-click day detail | PASS | Date cell opens fixed-date modal; normal UI supports create/edit/single delete; edited-to-other-date item leaves current detail; Plan persistent day block removed. |
| UAT-AC-03 Right-click shortcuts | PASS | Exactly New/Edit/Clear actions; Edit opens chooser/detail rather than guessing; Clear requires confirmation and cancellation is state-neutral; confirmed clear is date-bounded. |
| UAT-AC-04 Same-day multi-delete | PASS | State API validates all selected IDs belong to the requested date inside one transaction; focused UI and domain tests preserve unselected/other-date/Vector state. |
| UAT-AC-05 Today Current Vector | PASS | DTO distinguishes vector from acknowledgeable item; Today renders Vector in dedicated read-only region with no button/checkbox/completion control; acknowledgement API rejects Vector sources. |
| UAT-AC-06 Regression | PASS | Original identity/linkage, Vector overlap, restart/durability, backup/restore/migration, Scheduled Item acknowledgement and packaged tray lifecycle remain covered and green. |

## Scope / architecture

PASS. No recurrence, Reminder, Memo, Unscheduled, Week View, cross-date batch manager, AI/sync or other TA-1B/Future capability was introduced. SQLite schema/migration/backup/restore contracts were not changed. Today remains derived; Plan/Tracks remain authoritative. The correction adds a bounded same-day deletion operation and UI only.

## Failure-mode observations

- `deleteItems(date, ids)` de-duplicates selected IDs, rejects stale/cross-date IDs before deletion, performs deletion and acknowledgement cleanup in one transaction, and treats `null` as clear-current-date only.
- Existing historical Vector acknowledgement rows remain file-compatible but are ignored by the Vector DTO/UI and cannot be newly written through the public acknowledgement path; persistence/backup/restore compatibility is tested.
- No blocking regression was found in modal/detail/context-menu interaction from code and packaged automation. Human usability still requires focused Owner re-UAT because automation cannot establish visual/interaction value.

## CI / runtime

Builder-referenced Windows run `34027885631` is success on implementation SHA `629bf1ce...`. Independently, exact final review HEAD `7043aaf...` triggered run `34028136013`, also success, with `npm ci`, lint, typecheck, domain tests, integration tests, build, Windows packaging, packaged test, and artifact upload all successful.

## Findings

No blocking or task-scope implementation finding requiring Builder rework.

Non-blocking note: the one-click `启动 Workbench.cmd` remains a simple wrapper around the packaged `out/win-unpacked/Workbench.exe` and was not altered by UAT-C1. It is suitable for the focused Owner re-UAT entry path.

## Decision

**PASS**

Engineering / automated Reality correction gate is accepted. Do not declare TA-1A Stage Exit yet. Next mandatory step is focused Owner re-UAT of the corrected Month/day-maintenance interaction and Today Current Vector presentation. If focused Owner re-UAT passes, 05 should issue a short Stage Exit Handoff to 00. TA-1B remains unauthorized until 00 decides the next stage.
