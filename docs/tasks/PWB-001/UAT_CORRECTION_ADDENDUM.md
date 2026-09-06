# PWB-001｜TA-1A Owner UAT Correction Addendum

Status: READY FOR CORRECTION  
Revision: UAT-C1  
Task: `PWB-001｜TA-1A First Usable Core Vertical`  
Primary Builder: Codex  
Task Branch: `task/PWB-001-ta1a-first-usable-core`  
Correction Base before this Addendum: `65d8e73b29d7f59c676982e173dced46bb3c9fe0`

> This Addendum amends Acceptance only. The existing `docs/tasks/PWB-001/TASK.md` remains authoritative except where this Addendum adds or tightens the TA-1A Owner-UAT correction requirements below.
>
> Same Task, same Branch, same Builder. TA-1B remains NOT AUTHORIZED.

## 1. Authority

1. Owner current instruction — same PWB-001 / same branch / same Codex; implement only approved UAT correction.
2. `Vibe-Coding/workbench/decisions/D-004_TA-1AOwnerUATCorrectionScope.md` — APPROVED / CURRENT, blob `db15c394d965744d43ebced35ed0c830e5cf9f16`.
3. `Vibe-Coding/workbench/current/项目状态.md` — TA-1A Owner UAT Correction ACTIVE, blob `5704f8923d75689abecbd225feebbd33b88a9a1e`.
4. Existing `docs/tasks/PWB-001/TASK.md` — blob `9a12bb42f7dc81f4ebadfab37b155706fb9c963c`.
5. Frozen Product / Route / Architecture already referenced by the original Task Packet.

If this Addendum appears to require changing a frozen ownership / identity / persistence / date / tray contract, STOP and return the conflict. Do not solve it by expanding scope.

## 2. Correction Outcome

Close the specific TA-1A usability failures found in Owner real-data UAT:

- Month View becomes event-first and supports low-friction same-day maintenance;
- a date cell opens a usable day-detail surface;
- right-click provides bounded day-level shortcuts;
- same-day multi-select deletion is available;
- Today Current Vector is corrected to its non-completable, Plan-owned role and receives a distinct visual hierarchy.

Do not redesign Tracks and do not start TA-1B.

## 3. Acceptance Amendment

### UAT-AC-01｜Month Cell Is Event-First

Given a date containing one or more TA-1A single Scheduled Items:

- each item is identifiable in the Month View by its **title** inside that date cell;
- start/end time must not occupy a separate primary row or displace the title as the main cell content;
- full time remains available in day detail / edit UI;
- multiple event titles may be compacted as needed, but the Month View must not regress to a time-dominated list.

### UAT-AC-02｜Left-click Day Detail

Left-clicking a Month View date cell opens a dedicated day-detail GUI for that exact local date.

The day-detail GUI must:

- list all TA-1A single Scheduled Items on that date;
- allow creating a new single Scheduled Item with the clicked date as the active date context;
- allow editing a chosen item;
- allow deleting a chosen item;
- reflect create/edit/delete back into the canonical Plan state and Month View without requiring DB/CLI manipulation;
- never include items from another date unless the user explicitly changes the item date through the normal edit flow.

### UAT-AC-03｜Right-click Day Shortcuts

Right-clicking a Month View date cell opens a context menu containing these three actions:

- `新建日程`
- `编辑日程`
- `清空日程`

Required behavior:

- `新建日程` enters the create flow scoped to the clicked date;
- `编辑日程` enters that date's detail/edit surface and, when multiple items exist, **must not guess or silently choose one item**;
- `清空日程` targets only TA-1A single Scheduled Items on the clicked date;
- `清空日程` requires explicit confirmation before deletion;
- cancelling that confirmation leaves canonical state unchanged;
- confirming removes all single Scheduled Items on that date and preserves items on all other dates and preserves Current Vector state.

### UAT-AC-04｜Same-day Multi-select Delete

Within the day-detail GUI:

- Owner can select multiple single Scheduled Items from that displayed date;
- deleting selected items removes exactly the selected items;
- unselected items on that date remain;
- items on other dates remain;
- the feature does not become a cross-date batch manager.

### UAT-AC-05｜Today Current Vector Semantics

On Today:

- Current Vector has **no** `今日确认`, `已完成`, acknowledgement toggle, checkbox, or equivalent completion control;
- Current Vector has **no direct edit button/action**; editing remains in Plan;
- Current Vector is rendered as a dedicated, visually distinct information region, not as an ordinary Today's Schedule item card;
- it must be separable from Today's Schedule by structure (dedicated section/container + heading or equivalent hierarchy), not merely by changing text;
- Today continues to derive the Vector from Plan canonical state and does not persist a second Vector copy.

### UAT-AC-06｜Regression of Previously Passed TA-1A Paths

The correction must not regress the already-passed paths:

- real Windows tray use / close-hide / restore / real exit;
- Core state persistence across restart;
- acknowledgement persistence for **Today's Scheduled Items** and its isolation from Plan/Track facts;
- manual backup / validated restore;
- Current Vector inclusive no-overlap rejection;
- Track stable-ID linkage and the original `Tracks → Plan → Today` canonical ownership model.

All original PWB-001 Acceptance Gates remain applicable unless this Addendum explicitly tightens the UI behavior.

## 4. Explicit Non-scope

Do not implement or scaffold:

- recurrence / series / occurrence / exception;
- Reminder;
- Memo;
- Unscheduled;
- Week View;
- cross-date bulk editing/deletion;
- Milestones;
- AI / GPT / Codex-assisted Track maintenance;
- Google Calendar / sync;
- completion analytics / streak / scoring;
- any TA-1B or Future capability.

Tracks' current "slightly awkward" manual-maintenance feedback is observation only, not a correction requirement.

## 5. Validation

Add focused automated/UI coverage for UAT-AC-01..05 where practical, then rerun the existing PWB-001 regression contract.

Minimum required evidence:

1. Month View UI evidence with timed items proving title-first cell rendering.
2. Day-detail UI path proving list + create + edit + single delete.
3. Right-click menu test proving the three actions and multi-item edit does not auto-select an item.
4. `清空日程` cancel case → no DB change; confirm case → only clicked date cleared.
5. Same-day multi-select delete → selected removed, unselected/other-date items preserved.
6. Today Current Vector UI evidence proving no acknowledgement/completion control and no direct edit control.
7. State-level assertion that Today Vector remains derived from Plan and Scheduled Item acknowledgement behavior remains unchanged.
8. Existing lint / typecheck / domain / integration / build / packaged Windows tests rerun green, including tray, restart, backup/restore and Vector overlap coverage.

Use the repository's existing validation commands from `TASK.md`; do not create a second validation stack for this correction.

## 6. Git / Return Protocol

- Start from the exact task branch and record the actual HEAD after pulling this Addendum.
- Keep correction commits on `task/PWB-001-ta1a-first-usable-core`.
- Do not merge `main`; do not force-push; do not rewrite prior PWB-001 evidence.
- Commit messages include `PWB-001`.
- Add `docs/tasks/PWB-001/UAT_CORRECTION_COMPLETION.md` containing:
  - correction base SHA after Addendum;
  - correction implementation SHA;
  - final branch HEAD;
  - changed areas;
  - `UAT-AC-01..06` matrix;
  - exact validation results;
  - packaged Windows evidence if regenerated;
  - scope deviations / known limitations.
- Push the branch and stop at `READY FOR 05 INDEPENDENT RE-REVIEW`.
- After push, hand directly to 05; do not return to 04 for another routing pass.

Builder must not declare TA-1A PASS, Owner UAT PASS, or TA-1B readiness.
