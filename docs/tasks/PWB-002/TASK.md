# TASK｜PWB-002｜TA-1B Complete V0

Status: READY  
Type: IMPLEMENTATION  
Stage: TA-1B｜Complete V0  
Risk: R3｜High Risk  
Primary Owner: Codex  
Independent Review Owner: 05｜代码审核与 UAT  
Implementation Repository: `zhangchenjia21-dot/Workbench`  
Formal Code Base: `main@50bebd2b07619e4e06852ad8a20c110be0553315`  
Task Branch: `task/PWB-002-ta1b-complete-v0`  
Task Packet Path: `docs/tasks/PWB-002/TASK.md`

> One Main Outcome + One Primary Owner. TA-1B 完成 frozen V0，但不得重做或回退已经通过的 TA-1A。recurrence / Reminder / Memo / Unscheduled / Week View 必须接在现有 canonical state 与已验证 UX 基础上，而不是建立第二套产品路径。

---

## 1. Outcome

在已经通过 Owner real-data UAT、focused correction 与 Stage Exit 的 TA-1A 基础上，补齐 frozen V0 的剩余 Plan richness：

- recurrence；
- Reminder；
- Memo；
- Unscheduled；
- Week View；
- Today 对 recurrence / Reminder / Memo 的当天 projection；
- 完整 identity / exception / date / DST / migration / backup-restore integration。

完成后，Owner 应能在同一套 SQLite canonical Personal State 中自然使用完整 V0：

`Tracks → Plan (Month / Week + richer Plan semantics) → Today`

Builder 的最高声明只能是：

`IMPLEMENTED / READY FOR 05 INDEPENDENT REVIEW`

不得声明 Complete V0 Product PASS、Owner UAT PASS、TA-1B Stage Exit 或 TA-2 readiness。

---

## 2. Why Now

TA-1A 已完成 Engineering + Independent Review + Owner real-data UAT + UAT correction + focused re-UAT，并已 fast-forward 集成到 implementation `main`。

TA-1B 现在才补 recurrence / Reminder / Memo / Unscheduled / Week View，目的是在已经存在真实 Owner consumer 与已验证 Month/Today 交互基础上扩展 V0，而不是在 First Usable 前一次押注全部语义。

本 Task 不重新讨论 Product / Architecture / Route；若实现证据反证 frozen contract，必须 STOP 并回流，不得静默改写。

---

## 3. Authority / Source Manifest

Authority 从高到低：

1. Owner 当前明确指令：进入 TA-1B Complete V0 implementation dispatch；以 `Workbench/main@50bebd2b07619e4e06852ad8a20c110be0553315` 为 Formal Base；严格限制 frozen TA-1B scope；不得回退 TA-1A 已通过 UAT corrections。
2. `zhangchenjia21-dot/Vibe-Coding/workbench/current/产品定义.md`
   - status: current / canonical Product Definition
   - blob SHA: `b4ef90d8b8b1d627a9cf6d7b4cf706a6e034f167`
3. `zhangchenjia21-dot/Vibe-Coding/workbench/current/开发路线.md`
   - version: v1.2
   - status: ROUTE-FROZEN / CURRENT ROADMAP
   - blob SHA: `4e55cddefb185c65e16da1519cd3d251c2f030fe`
4. `zhangchenjia21-dot/Vibe-Coding/workbench/architecture/架构方案.md`
   - version: v1.1
   - status: ROUTE-FROZEN / CURRENT V0 ARCHITECTURE
   - blob SHA: `83c4ef37e95d80df3713095368e560a0c3bbe77b`
5. `zhangchenjia21-dot/Vibe-Coding/workbench/decisions/D-005_TA-1AStageExit与TA-1BAuthorization.md`
   - status: APPROVED / CURRENT
   - blob SHA: `084e424396439e3e1ca5e30f2ee565f61286fb08`
6. `zhangchenjia21-dot/Vibe-Coding/workbench/current/项目状态.md`
   - stage: Stage 1 / TA-1B Complete V0 — AUTHORIZED FOR DISPATCH
   - blob SHA: `65a909dd50f66ba3a157c671e7c5c02fcd2b877e`
7. Accepted TA-1A implementation facts at exact Formal Code Base `50bebd2b07619e4e06852ad8a20c110be0553315`.
8. TA-1A accepted UAT correction contract:
   - `docs/tasks/PWB-001/UAT_CORRECTION_ADDENDUM.md`
   - blob SHA at Formal Base: `dd9c0a9ee1f20fea9894435890e698f913a2f90e`
   - `docs/tasks/PWB-001/UAT_CORRECTION_COMPLETION.md`
   - blob SHA at Formal Base: `20e3d47933e71ec040d5f81a46465d1306d51074`
9. Current repository tests / runtime behavior at Formal Base.
10. Execution guidance already established in Vibe-Coding Task Packet / lifecycle skills.

Not authoritative unless a current source explicitly promotes them:

- exploration branch / G0.4 spike implementation;
- archived AI Collaboration route;
- old pre-correction UAT behavior that conflicts with accepted TA-1A correction;
- model memory or historical chat summaries.

If current authoritative sources materially conflict, STOP. Do not synthesize a third policy.

---

## 4. Read First

Read in this order:

1. This Task Packet.
2. `Vibe-Coding/workbench/current/开发路线.md` — especially TA-1B Main Work / Non-scope / Reality Gate.
3. `Vibe-Coding/workbench/architecture/架构方案.md` — especially ownership, identity, date/time, recurrence, persistence, backup/restore, UI boundary.
4. `Vibe-Coding/workbench/current/产品定义.md` — Today / Plan / recurrence / Reminder / Memo / Unscheduled / Calendar product semantics.
5. `Vibe-Coding/workbench/decisions/D-005_TA-1AStageExit与TA-1BAuthorization.md`.
6. `docs/tasks/PWB-001/UAT_CORRECTION_ADDENDUM.md` and `UAT_CORRECTION_COMPLETION.md` — regression contract; do not restore superseded TA-1A UX.
7. Current implementation entry points at Formal Base:
   - `src/个人状态/`
   - `src/桌面界面/`
   - `src/Bootstrap/`
   - `测试/`
   - `scripts/`
   - `package.json`
   - `.github/workflows/windows.yml`
8. Existing PWB-001 review/evidence only as needed to understand accepted production behavior.

Only expand context when required to implement a concrete gate. Record material expanded-read context in Completion Report.

---

## 5. Decision Digest / Invariants

### INV-PRODUCT-01｜Core Value
Complete V0 must preserve the product promise: a continuous, clear, low-maintenance, directly editable view of `long-term state → future plan → today`. Adding V0 richness must not turn Workbench into a generic Todoist / project-management system.

### INV-TA1A-01｜Accepted TA-1A UX Is Baseline
Do not regress accepted TA-1A behavior. At minimum preserve:

- Month cells are event-title-first, not time-dominated;
- left-click date cell opens dedicated day-detail GUI;
- day detail supports same-day create / edit / single delete / multi-select delete;
- right-click date cell exposes `新建日程 / 编辑日程 / 清空日程`, with clear confirmation and no multi-item guessing;
- Plan does not restore the superseded always-visible selected-day schedule panel;
- Today Current Vector has no acknowledgement/completion control;
- Today Current Vector has no direct edit control;
- Today Current Vector remains a visually distinct, Plan-owned derived region;
- tray / restart / backup-restore / Track linkage / Vector overlap behavior remains valid.

TA-1B may integrate recurring occurrences into existing Month/day-detail flows, but must not discard the interaction corrections above.

### INV-OWN-01｜Canonical Ownership
Tracks and Plan own business facts. Today remains derived by Owner local display date. Month and Week are two views over the same Plan canonical state, never separate schedule stores.

### INV-ACK-01｜Acknowledgement Boundary
Today acknowledgement is narrow visual state only. It must not mutate Plan, Track, recurring series, exception definitions, Reminder, Memo, Vector, score, streak or completion history.

Acknowledgement applies to Today schedule sources (single Scheduled Item or recurring occurrence) using stable source/occurrence identity and local display date. Current Vector, Reminder and Memo do not acquire completion semantics from this Task.

### INV-ID-01｜Stable Object Identity
Track / single Scheduled Item / Reminder / Memo / Unscheduled / Current Vector / Recurring Series use immutable internal IDs. Display title/name/date/time is not identity.

### INV-OCC-01｜Occurrence Identity
`OccurrenceIdentity = SeriesStableID + OriginalScheduledOccurrenceKey`.

Moving a single occurrence changes its displayed date/time through an exception but does not change its identity. Exception lookup, Today projection and acknowledgement must continue to refer to the original occurrence key.

### INV-DATE-01｜Date-only Is Not Timestamp
Date-only values are local calendar dates, not `00:00 UTC` timestamps. This applies to recurrence calendar dates, Reminder date-only semantics, Memo display date and other date-only fields.

### INV-TIME-01｜Local Wall-time
Recurring local schedules such as “09:00 every Monday” use local wall-time semantics. DST/offset changes must not silently convert the user's semantic 09:00 into a fixed UTC-hour recurrence.

### INV-REC-01｜Dynamic Recurrence
Recurring future occurrences are dynamically expanded from series definition. Do not pre-persist the entire future occurrence set.

Persist only series definition plus explicit exceptions when needed.

### INV-REC-02｜Allowed Scope Choices
V0 recurrence edit/delete scope is only:

- `仅这一次`
- `整个循环`

Do not implement or scaffold `这一次及以后`.

### INV-REC-03｜Single-occurrence Exception
Editing or deleting only one occurrence creates/updates the exception for that occurrence identity and does not mutate unrelated occurrences or the series rule.

### INV-REC-04｜Whole-series Edit With Exceptions
If a whole-series edit is requested while exceptions exist:

1. explicitly warn that existing single-occurrence exceptions will be cleared;
2. cancellation leaves series and exceptions unchanged;
3. confirmation updates the series definition and clears existing exceptions;
4. do not auto-remap old exceptions to the new rule.

### INV-REC-05｜Whole-series Delete
Deleting the entire series removes the series from future projection and removes/invalidates its exceptions consistently. It must not delete unrelated single items or other series.

### INV-VECTOR-01｜Current Vector
TA-1A Vector contract remains inclusive `[startDate, endDate]`, no overlap, Plan-authoritative, Today-derived, no completion semantics.

### INV-STORE-01｜SQLite Canonical Store
SQLite remains the only canonical Core Personal State store, at per-user application data location.

### INV-MIGRATION-01｜Existing Owner Data Must Upgrade
TA-1B must extend the existing production schema through ordered transactional migration(s). Real TA-1A databases cannot require delete/recreate. Create a pre-upgrade safety backup before migration; failure rolls back and must not continue on half-upgraded state.

### INV-BACKUP-01｜Complete V0 Recovery
Backup / restore must preserve the complete V0 graph after TA-1B: Tracks, links, single items, series, exceptions, Reminder, Memo, Unscheduled, Vector and acknowledgement state as applicable.

Restore continues to validate, safety-snapshot, stage/migrate, replace only after validation, reopen and verify.

### INV-SCOPE-01｜No Future Platform
Do not add Milestones, AI-assisted Track Update, GitHub/Google sync, Custom Functions, Knowledge/Habit/Finance/Health, AI Collaboration, Plugin/SDK/Page Builder, cloud/multi-device sync or generic extension frameworks.

---

## 6. Authorized Scope

### 6.1 Recurring Series

Add V0 recurring Scheduled Item semantics to Plan:

- immutable Series ID;
- title;
- start date;
- optional end date;
- local start / end time;
- recurrence pattern:
  - daily; or
  - weekly with one or more weekdays;
- optional Track Link by stable Track ID;
- user-accessible create / edit / delete flow;
- dynamic occurrence expansion into Month / Week / Today / day-detail views;
- stable occurrence identity per frozen contract.

Exact internal schema/library design is an implementation detail so long as frozen semantics are preserved.

### 6.2 Recurrence Exceptions

Support persisted exceptions only when required:

- single-occurrence move/edit;
- single-occurrence delete;
- no pre-materialized future occurrence table/list as canonical truth;
- occurrence identity remains based on original scheduled key after move.

User operations that can affect recurrence must present exactly the V0 scope choices required by the frozen contract (`仅这一次 / 整个循环`) rather than silently choosing scope.

### 6.3 Whole-series Policy

Implement the frozen RC-04 behavior for whole-series edit when exceptions exist: explicit warning → cancel or confirm → on confirm update series + clear old exceptions, no remap.

Whole-series delete must delete the series coherently and not leave live orphan exception behavior.

### 6.4 Reminder

Add a distinct Plan Reminder semantic for information requiring Owner attention on a date / optional time as supported by the current Product Definition.

Required:

- immutable ID;
- directly user-editable content sufficient to identify the reminder;
- date/deadline semantics represented without abusing UTC-midnight for date-only values;
- user-accessible create / edit / delete maintenance;
- Today shows only Reminder whose relevant display/deadline date is today;
- future Reminder does not appear on Today;
- Reminder does not acquire Scheduled Item completion/acknowledgement semantics unless a current authoritative source explicitly requires it (none currently does).

Do not evolve Reminder into alarms, notification scheduler, escalation engine, recurring reminder framework or task hierarchy.

### 6.5 Memo

Add a distinct Plan Memo semantic:

- immutable ID;
- memo content;
- display date;
- user-accessible create / edit / delete maintenance;
- Today shows Memo whose display date is today;
- future Memo does not appear on Today;
- Memo remains information, not a task/completion object.

### 6.6 Unscheduled

Add Plan Unscheduled semantics for:

> Owner 已决定近期要做，但尚未决定具体时间。

Required:

- immutable ID;
- directly maintainable user content;
- optional Track Link where consistent with current product model;
- user-accessible create / edit / delete maintenance;
- clear Plan entry distinct from scheduled Calendar items / Reminder / Memo / Vector;
- Unscheduled never automatically appears on Today;
- no subtasks, kanban, complex priorities, project management or cross-date bulk manager.

### 6.7 Week View

Add a genuinely usable Week View over the same canonical Plan state:

- Month / Week switch from normal UI;
- week navigation sufficient for real planning;
- single Scheduled Items and expanded recurring occurrences appear on the correct local dates/times;
- editing/deleting through supported UI paths updates the same canonical objects seen by Month and Today;
- Month and Week must not maintain duplicate live data;
- no Day View requirement.

Reminder / Memo / Unscheduled / Vector should retain their distinct Plan semantics and must not be forced into a generic “calendar event” model merely to populate Week View.

### 6.8 Month / Day-detail Integration

Extend the accepted TA-1A Month / day-detail experience to recurring occurrences without reverting it:

- Month remains event-title-first;
- left-click date still opens exact-date day detail;
- day detail may contain both single Scheduled Items and recurring occurrences for that date;
- single-item operations preserve existing behavior;
- occurrence edit/delete asks for the required recurrence scope;
- same-day multi-select deletion must not become an ambiguous recurrence bulk operation. If recurring occurrences are included in multi-select, semantics must be explicit and bounded; otherwise limiting TA-1A multi-select to single Scheduled Items is acceptable. Do not silently apply a scope across multiple recurring occurrences.

Right-click day shortcuts remain valid for TA-1A single-item maintenance; adding recurrence must not make existing operations guess a series/occurrence target.

### 6.9 Today Complete V0 Projection

Today remains narrow and must show, for the Owner local current date:

- effective Current Vector;
- single Scheduled Items;
- recurring occurrences after exceptions;
- today's Reminder;
- today's Memo.

Today must not show:

- Unscheduled;
- all Tracks;
- future Reminder/Memo preview;
- completion rate / streak / score.

Scheduled Item / recurring occurrence acknowledgement remains a visual Today state only. A moved occurrence must display on its moved date while retaining original occurrence identity for exception/ack logic.

### 6.10 Persistence / Recovery / Migration

Extend existing production persistence rather than replacing it:

- ordered transactional schema migration from current Formal Base DB;
- pre-upgrade safety backup;
- migration success + injected failure rollback fixtures;
- invalid/unsupported backup rejection remains;
- restore of older valid Workbench backup may migrate in staging when a valid migration path exists;
- backup / restore of current Complete V0 preserves all TA-1B relationships and stable IDs;
- app restart after writes/restore/migration yields the same canonical Complete V0 projection.

### 6.11 Desktop / Packaging Regression

Existing Electron Windows packaged lifecycle remains required:

- normal launch → Today;
- close → hide to tray;
- real tray restore/focus;
- real exit;
- no startup-at-login.

TA-1B should reuse the existing host instead of rebuilding the desktop shell.

---

## 7. Explicit Prohibited Scope

Do not implement or scaffold:

- recurrence `这一次及以后`;
- completion history;
- streak / scoring / productivity analytics;
- Habit semantics;
- Reminder notification/alarm delivery platform beyond current V0 display semantics;
- Milestones;
- GitHub Source sync / AI-assisted Track Update;
- Google Calendar sync;
- Custom Functions;
- Launch Target;
- Knowledge / Habit / Finance / Health modules;
- AI Collaboration;
- Plugin Marketplace / SDK / Page Builder;
- multi-device / cloud sync;
- login / account / team / tenant systems;
- autostart / startup-at-login;
- updater/signing/release service unless required only for existing packaged validation;
- generic Todoist / project-management expansion;
- speculative future schema/extension tables with no TA-1B consumer;
- a second canonical store or duplicated Month/Week/Today truth.

Do not rewrite frozen Product / Route / Architecture from this task.

---

## 8. Suggested Internal Implementation Order

Sequencing guidance only; ownership remains one Codex task:

1. Audit current accepted TA-1A state/tests and write a concise state/failure matrix for TA-1B schema + recurrence identity before changing DDL.
2. Extend L0 domain contracts for series / occurrence identity / exceptions / Reminder / Memo / Unscheduled without changing TA-1A identities.
3. Add ordered schema migration(s) and repository/domain operations; prove old TA-1A fixture migration + rollback first.
4. Implement recurrence expansion + exception semantics with deterministic date/time tests.
5. Integrate recurrence into Month/day-detail while preserving accepted TA-1A UX.
6. Add Reminder / Memo / Unscheduled maintenance UI as distinct Plan semantics.
7. Add Week View over the same canonical state.
8. Extend Today projection for recurrence / Reminder / Memo and occurrence acknowledgement.
9. Extend backup/restore fixtures to full V0 graph.
10. Run focused domain/date/DST/migration tests → full regression → packaged Windows UI/lifecycle evidence.
11. Produce Completion Report, push exact final branch state, then hand directly to 05.

Do not optimize visual polish before identity / migration / projection gates are green.

---

## 9. Deliverables

Builder must deliver on the Task Branch:

1. Production implementation for TA-1B frozen scope only.
2. Ordered migration(s) from TA-1A production schema/data.
3. Domain tests for recurrence expansion / identity / exceptions / whole-series policy.
4. Date-only / local wall-time / DST boundary tests.
5. Integration tests for Today projection, Month/Week canonical consistency, acknowledgement, backup/restore and migration rollback.
6. Direct normal-UI paths for recurrence, Reminder, Memo, Unscheduled and Week View.
7. Packaged Windows validation proving complete V0 user paths and preserving TA-1A UAT corrections.
8. Existing Windows CI updated only as needed to reproduce TA-1B validation; do not create a general release platform.
9. `docs/tasks/PWB-002/COMPLETION.md` with acceptance matrix and exact evidence.
10. Small run/use documentation updates needed for Complete V0.

---

## 10. Engineering Acceptance Gates

### AC-01｜TA-1A Regression Baseline
All accepted TA-1A paths remain valid at the TA-1B review target, including:

- Track create/edit/lifecycle + stable linkage;
- Vector inclusive no-overlap;
- Month title-first cells;
- left-click day detail;
- right-click new/edit/clear behavior + confirmation;
- same-day single/multi-delete semantics;
- no restored always-visible selected-day schedule panel;
- Today Vector no completion/ack and no direct edit, with distinct hierarchy;
- Scheduled Item acknowledgement isolation/persistence;
- SQLite restart, backup/restore and packaged tray lifecycle.

### AC-02｜Recurring Series Creation / Projection
Through normal UI, Owner can create daily and weekly-by-weekday series with start date, optional end date, local start/end time and optional Track Link. Correct occurrences appear dynamically in Month / Week / Today/day-detail for dates within the series range, and none appear outside it.

### AC-03｜Dynamic Expansion / No Second Truth
Future recurrence is generated from series definition + exceptions. Review must find no independently maintained future occurrence set acting as a second canonical schedule truth.

### AC-04｜Stable Occurrence Identity
For a known series occurrence, `OccurrenceIdentity` is based on `SeriesStableID + OriginalScheduledOccurrenceKey`. After a single occurrence is moved to a new date/time, it is displayed at the new location while edit/delete/Today acknowledgement continue to address the original occurrence identity.

### AC-05｜Single-occurrence Edit/Delete
Choosing `仅这一次` for edit creates/updates only that occurrence exception; unrelated occurrences remain unchanged. Choosing `仅这一次` for delete suppresses only that occurrence. Series definition remains unchanged.

### AC-06｜Whole-series Edit/Delete Scope
When `整个循环` is selected, the operation applies to the series rather than a single occurrence. Whole-series delete removes that series/its effective occurrences without affecting unrelated items/series. No `这一次及以后` path exists.

### AC-07｜Whole-series Edit + Existing Exceptions Policy
Given a series with at least one persisted exception, selecting whole-series edit produces an explicit warning that existing exceptions will be cleared. Cancel leaves series + exceptions byte/semantically unchanged. Confirm updates the series and clears those exceptions. No old exception remapping occurs.

### AC-08｜Reminder Semantics
Owner can create/edit/delete Reminder through normal UI. Today includes reminders whose relevant date/deadline is today and excludes future reminders. Date-only reminder semantics do not rely on UTC-midnight encoding. Reminder does not acquire schedule completion/streak semantics.

### AC-09｜Memo Semantics
Owner can create/edit/delete Memo through normal UI. Today includes memos whose display date is today and excludes future memos. Memo remains informational and is not treated as a Scheduled Item completion object.

### AC-10｜Unscheduled Semantics
Owner can create/edit/delete Unscheduled entries through a clear Plan path. They remain distinct from calendar-scheduled items and never automatically appear on Today. No task-manager hierarchy/priority/kanban expansion is introduced.

### AC-11｜Week View / Canonical Consistency
Owner can switch Month ↔ Week and navigate weeks through normal UI. Single items and recurring occurrences appear on correct local dates/times. An edit made through a supported path is reflected consistently in Month / Week / Today because all views read the same canonical Plan state.

### AC-12｜Today Complete V0 Projection
For a controlled local date, Today shows exactly:

- effective Current Vector;
- that date's single Scheduled Items;
- that date's recurring occurrences after exceptions;
- Reminder for today;
- Memo for today.

It excludes Unscheduled, all Tracks, future Reminder/Memo and score/streak analytics. Today does not persist copies of Plan facts.

### AC-13｜Occurrence Acknowledgement
Acknowledging a recurring occurrence changes only narrow acknowledgement state keyed by local display date + occurrence identity. It does not mutate series, exception, Track or Plan facts. Restart restores same-day acknowledgement. A moved occurrence uses its original occurrence identity while appearing/acknowledging on the moved display date.

### AC-14｜Date-only / Local Wall-time / DST
Automated deterministic tests cover at minimum:

- date-only boundary without UTC-midnight reinterpretation;
- weekly weekday expansion;
- inclusive recurrence start and optional end boundaries;
- local 09:00 (or equivalent fixed wall-time test) across a DST offset transition remains 09:00 local semantics;
- moved occurrence across date/time retains identity;
- Owner-local Today filtering around date boundary.

### AC-15｜Migration / Existing Data Preservation
A fixture representing the accepted TA-1A production schema/data migrates to current TA-1B schema through ordered transaction(s) while preserving existing Track IDs, Plan IDs, links, Vector, single items and acknowledgement behavior. A deliberately failing migration rolls back DDL/data/version state and the app does not continue on a half-upgraded DB. Pre-upgrade safety backup exists.

### AC-16｜Backup / Restore Complete V0
A backup containing a representative full V0 graph can be independently validated and restored with stable identities/relationships intact. Restore safety snapshot + staging + validation remain enforced. Older supported Workbench backup can follow the ordered migration path in staging. Invalid backup is rejected before live replacement.

### AC-17｜Direct Complete-V0 Usability
All TA-1B product semantics are exercisable through ordinary packaged UI; acceptance does not depend on DB editing, hidden CLI mutation or tests as the only path. UI must retain distinct user meanings for Scheduled Item / Recurrence / Reminder / Memo / Unscheduled / Vector rather than collapsing them into an opaque universal object form.

### AC-18｜Packaged Windows / Existing Host Regression
The packaged Windows app boots to Today, preserves close→tray / restore-focus / real Exit, and Complete V0 paths work without a dev server. TA-1B does not replace Electron or introduce a second host.

### AC-19｜Scope Integrity
Base→implementation diff contains only TA-1B frozen scope plus necessary tests/docs/migrations/refactors tightly required by it. There is no `这一次及以后`, Milestones, AI/sync/custom/plugin/cloud platform, completion analytics, speculative future schema, or silent frozen-contract change.

---

## 11. Product Value Acceptance Boundary

Primary Purpose / Core Value remains:

> Owner can keep one low-maintenance desktop workbench resident and quickly understand/edit `what I am advancing long-term → how I have arranged the future → what matters today` without maintaining conflicting copies of state.

TA-1B adds richness only if it preserves this simplicity.

Builder / automated tests can prove engineering behavior, not Product PASS. After 05 Independent Review, Owner Complete V0 UAT must decide at minimum:

1. recurrence creation/edit/delete scope 是否自然；
2. Reminder / Memo / Unscheduled 是否值得维护、语义是否清楚；
3. Month / Week 是否都真正有帮助且没有状态分叉；
4. Today 加入 recurrence / Reminder / Memo 后是否仍一眼清楚；
5. TA-1A 已通过的 Month/day-detail/Vector 体验是否保持；
6. 完整 V0 的维护成本是否仍低于它节省的回忆、查找和重新规划成本；
7. 是否出现必须在 TA-2 前立即修正的可靠性/产品问题。

Engineering green 不等于 Complete V0 UAT PASS。

---

## 12. Validation Contract

Use and extend the existing repository validation stack. At minimum preserve runnable commands:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run package:win
npm run test:packaged
```

If additional focused scripts/tests are added, they must be invoked by or clearly mapped into this existing validation flow; do not create an unrelated second CI/testing system.

Validation order:

1. recurrence/domain identity + exception tests;
2. date-only / DST tests;
3. migration success/failure + backup/restore integration;
4. Today / Month / Week canonical projection tests;
5. TA-1A regression suite;
6. lint / typecheck / full domain/integration tests;
7. production build;
8. packaged Windows build;
9. packaged normal-UI Complete V0 paths + tray regression;
10. Windows CI / artifact evidence inspection.

Minimum negative/boundary cases:

- weekly series multiple weekdays;
- recurrence start/end inclusive boundaries;
- occurrence move identity preserved;
- single delete does not alter series;
- whole-series edit with exceptions: cancel unchanged / confirm clears exceptions;
- whole-series delete leaves unrelated data untouched;
- no `这一次及以后` UI/API path;
- date-only not shifted by timezone/UTC conversion;
- local wall-time around DST transition;
- future Reminder/Memo excluded from Today;
- Unscheduled excluded from Today;
- Current Vector still cannot be acknowledged;
- Month/day-detail/right-click/multi-delete TA-1A correction regression;
- failed migration rollback;
- invalid backup rejected;
- full V0 backup/restore preserves identities/relationships;
- packaged close does not terminate; real Exit does.

A green dev-only suite is insufficient.

---

## 13. Git Responsibility

### Start

- Verify branch is `task/PWB-002-ta1b-complete-v0`.
- Verify its ancestry starts exactly from Formal Base `50bebd2b07619e4e06852ad8a20c110be0553315` plus this Task-Packet-only commit.
- Record `git status` and current HEAD before production changes.
- Unknown dirty changes or unexpected branch divergence are STOP conditions.

### During

- Keep all PWB-002 work on this Task Branch.
- Do not write or merge directly to `main`.
- Do not force-push or rewrite accepted PWB-001 history.
- Do not delete/reseed an existing Owner DB as an upgrade strategy.
- Keep unrelated refactors out unless required for a specific Acceptance Gate; document any such refactor.
- Commit messages include `PWB-002`.

### Finish

- Commit and push the Task Branch.
- Do not merge `main`.
- Create `docs/tasks/PWB-002/COMPLETION.md`.
- Return exact implementation SHA before completion/evidence-only commits and exact final branch HEAD.
- If `main` advanced during implementation, report it. Do not silently merge/rebase unknown changes.
- After push, hand directly to 05. Do not return to 04 for another routing pass.

PR creation is optional; exact SHA review is authoritative.

---

## 14. Stop Conditions

STOP and return a bounded finding if any of the following occurs:

1. A frozen TA-1B requirement appears impossible without changing canonical ownership, identity, recurrence, date/time, SQLite, migration, backup/restore or Electron contracts.
2. Implementing recurrence would require pre-materializing future occurrences as a second canonical truth.
3. Existing TA-1A production data cannot migrate safely without destructive reset.
4. Meeting acceptance appears to require `这一次及以后`, generic task-management expansion or another Deferred capability.
5. TA-1B implementation would require reverting an accepted TA-1A UAT correction.
6. Current authoritative sources materially conflict.
7. Unknown parallel changes would need destructive overwrite/rebase.
8. A major new platform abstraction is proposed only for hypothetical post-V0 consumers.

Return:

```text
Finding
Impact
Options
Recommendation
Required Owner Decision
```

Do not resolve by silently changing frozen Product / Architecture / Route.

---

## 15. Completion Report Contract

Create `docs/tasks/PWB-002/COMPLETION.md` with at least:

```text
Task ID: PWB-002
Result: IMPLEMENTED | BLOCKED
Task Branch
Formal Base SHA
Task Packet Commit SHA
Implementation Commit SHA before Completion Report
Final Branch HEAD (may be returned after report commit)
Changed Files / Areas
Implementation Summary
Schema / migration summary
Recurrence / identity / exception model summary
UI integration summary
Acceptance Matrix AC-01..AC-19: PASS | FAIL | NOT RUN
Exact validation commands/results
Date/DST evidence
Migration/rollback evidence
Backup/restore full-V0 evidence
Windows packaged + CI/artifact evidence
TA-1A regression evidence
Known Limitations
Scope Deviations
Unexpected Findings
Expanded-read context, if any
Recommended Next Action: 05 INDEPENDENT REVIEW | OWNER DECISION
```

Do not hide NOT RUN/FAIL under generic “tests passed”.

---

## 16. Direct 05 Independent Review Handoff

After Builder pushes implementation + Completion Report, hand directly to `05｜代码审核与 UAT` with:

```text
Repo: zhangchenjia21-dot/Workbench
Task ID: PWB-002
Stage: TA-1B Complete V0
Formal Base: 50bebd2b07619e4e06852ad8a20c110be0553315
Task Branch: task/PWB-002-ta1b-complete-v0
Task Packet: docs/tasks/PWB-002/TASK.md
Completion Report: docs/tasks/PWB-002/COMPLETION.md
Production Implementation SHA: <builder exact SHA>
Exact Final Review HEAD: <builder final HEAD>
```

05 must independently inspect Base→Implementation→Final HEAD and must not accept Builder's matrix as proof.

Minimum independent review focus:

- full TA-1B scope completeness;
- no Future/Deferred leakage;
- no TA-1A UAT correction regression;
- series/occurrence/exception canonical model;
- original occurrence identity after move;
- scope semantics `仅这一次 / 整个循环` and absence of `这一次及以后`;
- whole-series exceptions warning/clear policy;
- date-only / local wall-time / DST correctness;
- Reminder / Memo / Unscheduled product semantics;
- Month / Week same canonical state;
- Today recurrence / Reminder / Memo projection + acknowledgement isolation;
- migration from real TA-1A schema/data and rollback safety;
- backup/restore preservation of complete V0 graph;
- packaged Windows lifecycle/regression;
- test quality, negative cases and runtime evidence;
- readiness for Owner Complete V0 UAT.

Formal review result remains:

`PASS | PASS_WITH_NOTES | REVISION_REQUIRED | BLOCKED`

If ordinary implementation revision is required, return to the same PWB-002 / Codex; do not create a new feature task.

Only after 05 Engineering / Reality Review is sufficient may 05 lead Owner Complete V0 UAT. TA-2 is not automatically authorized by Builder completion or 05 PASS.

---

## 17. Dispatch State

`PWB-002 = READY`

Authorized target:

`TA-1B Complete V0 only`

Direct lifecycle:

`Codex Implementation → 05 Independent Review → Owner Complete V0 UAT → 00 Stage Decision`
