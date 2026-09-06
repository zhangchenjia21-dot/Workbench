# TASK｜PWB-001｜TA-1A First Usable Core Vertical

Status: READY  
Type: IMPLEMENTATION  
Stage: TA-1A｜First Usable Core Vertical  
Risk: R2｜Elevated  
Primary Owner: Codex  
Independent Review Owner: 05｜代码审核与 UAT  
Implementation Repository: `zhangchenjia21-dot/Workbench`  
Formal Code Base: `main@87d1aba19ab67ea8e87c592447d9f982eca79c04`  
Task Branch: `task/PWB-001-ta1a-first-usable-core`  
Task Packet Path: `docs/tasks/PWB-001/TASK.md`

> One Main Outcome + One Primary Owner. TA-1A 作为一个真实纵向由同一个 Builder 端到端实现；不要把 Tracks / Plan / Today / persistence / desktop host 分给不同实现 Agent 接力修改。

---

## 1. Outcome

交付第一版**真实可用的 Windows Personal Workbench**：Owner 能在 packaged Electron app 中持续维护最小 `Tracks → Plan → Today` 纵向，把真实 CPA / 求职 / 项目 / 生活信息放入本地 SQLite，并在重启、备份/恢复和 tray 驻留后保持 canonical state 正确。

完成本 Task 后，Builder 的最高声明是：

`IMPLEMENTED / READY FOR INDEPENDENT REVIEW`

不是 Product PASS，也不是 TA-1A Stage Exit。05 Independent Review / Reality Gate 与 Owner real-data UAT 仍为后续强制 Gate。

---

## 2. Why Now

Stage 0 Route Freeze 已 PASS，当前唯一授权 production target 是 TA-1A。

TA-1A 的目的不是提前做完整 V0，而是尽早验证：

- Thin Track 是否自然；
- 简单 Plan 是否值得维护；
- Today 是否能快速看清当前局面；
- Electron tray 是否形成长期驻留体验；
- 本地 Personal State 是否能安全持久保存。

继续先做 recurrence / Reminder / Memo / Unscheduled / Week View 会推迟真实产品反馈，因此这些能力严格不进入本 Task。

---

## 3. Authority / Source Manifest

Authority 从高到低：

1. 用户当前明确指令：进入 TA-1A implementation dispatch，严格限制在 TA-1A scope。
2. `zhangchenjia21-dot/Vibe-Coding` `workbench/current/产品定义.md`  
   - status: current / canonical Product Definition  
   - blob SHA: `b4ef90d8b8b1d627a9cf6d7b4cf706a6e034f167`
3. `zhangchenjia21-dot/Vibe-Coding` `workbench/current/开发路线.md`  
   - version: v1.2  
   - status: ROUTE-FROZEN / CURRENT ROADMAP  
   - blob SHA: `4e55cddefb185c65e16da1519cd3d251c2f030fe`
4. `zhangchenjia21-dot/Vibe-Coding` `workbench/architecture/架构方案.md`  
   - version: v1.1  
   - status: ROUTE-FROZEN / CURRENT V0 ARCHITECTURE  
   - blob SHA: `83c4ef37e95d80df3713095368e560a0c3bbe77b`
5. `zhangchenjia21-dot/Vibe-Coding` `workbench/decisions/D-003_V0RouteFreeze与TA-1AImplementationAuthorization.md`  
   - status: APPROVED / CURRENT  
   - blob SHA: `4bb5588e47a241dd859162c57d073def3e779c13`
6. `zhangchenjia21-dot/Vibe-Coding` `workbench/current/项目状态.md`  
   - stage: Stage 1 / TA-1A AUTHORIZED FOR DISPATCH  
   - blob SHA: `7ceaf7abb3f3c140eb5443e1e75ac0b86988e560`
7. Current implementation facts in this repository, starting from exact Formal Code Base above.
8. Execution guidance: `Vibe-Coding/skill/gpt/agent-task-packet/SKILL.md` and `Vibe-Coding/skill/gpt/lifecycle-dev-process/SKILL.md`.

Supporting evidence only, **not architecture authority**:

- `Vibe-Coding/workbench/research/G0.4_Technical_Spike_Results.md`
- `Workbench` branch `exploration/g04-spikes-20260906`

Archive / historical AI-collaboration route / old handoffs / model memory are not authoritative unless explicitly referenced by a current source above.

If two current authoritative sources materially conflict, STOP and return the conflict. Do not synthesize a third policy.

---

## 4. Read First

Read in this order before implementation:

1. This Task Packet.
2. `workbench/current/产品定义.md` — Primary Purpose, Core Value, V0 Strategy, Today / Plan / Tracks, Product Experience Requirements.
3. `workbench/current/开发路线.md` — Frozen Contracts + TA-1A only.
4. `workbench/architecture/架构方案.md` — canonical ownership, identity/date, persistence, backup/restore, desktop host, First Usable boundary.
5. `workbench/decisions/D-003_V0RouteFreeze与TA-1AImplementationAuthorization.md`.
6. Current `Workbench` `main` tree / README and exact Formal Code Base.
7. G0.4 technical spike results only where useful for already-proven Windows Electron / SQLite seams.

Only expand context when these sources are insufficient; if you do, explain why in Completion Report.

---

## 5. Decision Digest / Invariants

### INV-PRODUCT-01｜Core Value
The increment must support the product promise: one continuous, clear, low-maintenance, directly editable view of `long-term state → future plan → today`. Engineering convenience must not create duplicate truths or turn the product into a generic task manager.

### INV-HOST-01｜Desktop Host
Electron is the frozen V0 desktop host. Do not add Tauri/native dual-host abstractions.

### INV-STORE-01｜Canonical Store
SQLite is the only V0 canonical persistent store for Core Personal State. Do not introduce JSON/files/cloud/GitHub as a second live truth.

### INV-STORE-02｜Location
Production DB lives under the Electron/Windows per-user application-data location, never in install directory, repository checkout, or an assumed sync folder.

### INV-OWN-01｜Ownership
Tracks and Plan own business facts. Today is primarily a date-derived projection. Today must not copy Track/Plan facts into independent live state.

### INV-ACK-01｜Today Acknowledgement
Persistent acknowledgement is narrowly keyed by local display date + stable source identity + acknowledged flag. It is visual confirmation only; it must not mutate Plan, Track, lifecycle status, score, streak, completion history, or recurrence semantics.

### INV-ID-01｜Stable Identity
Track, Scheduled Item and Current Vector use immutable internal IDs. Display names/titles are editable and never identity. Plan→Track links use Track stable ID.

### INV-DATE-01｜Date Semantics
Date-only values are calendar dates, not UTC-midnight timestamps. System timestamps such as created/updated/backup metadata may use real instants.

### INV-VECTOR-01｜Current Vector
Vector interval is inclusive `[startDate, endDate]`. At most one Vector can cover a local calendar date. Create/edit causing overlap must be rejected; do not auto-truncate another Vector.

### INV-DURABILITY-01｜Writes
Canonical writes are transactional. Committed state survives restart; interrupted/uncommitted writes do not become canonical state.

### INV-MIGRATION-01｜Schema Evolution
Schema versioning and ordered transactional migrations exist from the first production schema. Upgrade of an existing DB creates a safety backup before migration; failed migration rolls back and must not continue on a half-upgraded canonical DB.

### INV-BACKUP-01｜Backup
Manual backup creates a consistent standalone SQLite snapshot that passes validation.

### INV-RESTORE-01｜Restore
Restore must validate the selected file, confirm supported schema/migration path, create a pre-restore safety snapshot, prepare/validate in staging, close canonical connection before replacement, then reopen and verify. Never directly overwrite the live DB with an arbitrary selected file.

### INV-DESKTOP-01｜Tray Lifecycle
Normal launch enters Today. Window close hides to tray rather than terminating. Tray action restores/focuses the window. Tray menu exposes real exit. Startup-at-login is Deferred.

### INV-SCOPE-01｜No Speculative Platform
Do not build plugin/SDK/framework/AI/sync/custom-page platform seams for imagined future consumers.

---

## 6. Authorized Scope

### 6.1 Application Foundation

Build the minimum maintainable Electron application needed to directly experience TA-1A on Windows.

Required:

- packaged Windows Electron app;
- Today as default entry;
- simple direct navigation among Today / Plan / Tracks;
- minimal user-accessible entry for backup / restore without creating a broad Settings platform;
- maintainable TypeScript-based code is preferred; exact renderer/UI library and SQLite binding are implementation details, but choices must be recorded in Completion Report;
- no design-system project or speculative abstraction layer.

### 6.2 Tracks

Implement the frozen Thin Track business set:

- immutable Track ID;
- Name;
- Long-term Goal;
- Current Phase;
- Current Real State;
- Near-term Direction;
- Last Updated;
- Status = Active / Completed / Archived;
- create and edit;
- lifecycle movement among the three statuses;
- default Tracks view shows Active, with explicit access to Completed and Archived;
- Track rename must not break Plan linkage.

Do not implement Milestones, AI/source update workflow, scoring, task/subtask hierarchy, or project-management features.

### 6.3 Plan

Implement only TA-1A Plan semantics:

**Current Vector**
- immutable ID;
- start date / end date;
- content sufficient to express the current attention direction;
- create/edit needed for real maintenance;
- hard reject inclusive date overlap;
- optional Track Link is allowed where consistent with the frozen model.

**Single Scheduled Item**
- immutable ID;
- Title;
- Date;
- Start / End Time;
- optional Track Link by stable Track ID;
- create/edit needed for real maintenance;
- deletion/cancellation may be implemented only as the minimal direct-maintenance operation for a single item; do not introduce recurring/cancellation frameworks.

**Month View**
- one genuinely usable calendar month view;
- Owner can inspect scheduled items by date and reach the create/edit path without developer tooling;
- current month navigation sufficient for real planning;
- do not implement Week View.

### 6.4 Today

Today is the default homepage and must show only TA-1A information:

- Current Vector effective for Owner local date;
- single Scheduled Items occurring today;
- acknowledgement control/visual state for today’s displayed source items;
- acknowledgement persists across restart for the same local date/source identity;
- acknowledgement must not change underlying Plan or Track facts.

Explicitly do **not** display or implement:

- all Tracks;
- Unscheduled;
- future preview;
- Reminder;
- Memo;
- recurrence;
- completion rate / streak / score.

### 6.5 Persistence / Recovery

Required production behavior:

- SQLite canonical DB at per-user app-data location;
- schema version baseline;
- ordered transactional migration mechanism;
- durable transactional writes;
- restart persistence;
- manual consistent backup;
- invalid backup rejection;
- staged validated restore;
- automatic pre-restore safety snapshot;
- automatic pre-upgrade safety backup;
- migration success fixture and failure/rollback fixture;
- app reopen after backup/restore/migration still reads correct canonical state and relationships.

A heavyweight recovery subsystem, cloud history, sync, or automatic version-history product is prohibited.

### 6.6 Desktop Lifecycle

Required:

- Electron packaged app runs on Windows;
- Tray object exists in packaged runtime;
- closing main window hides it while process stays alive;
- tray restore path shows and focuses existing main window;
- explicit tray Exit terminates process;
- restore handler used for automated packaged lifecycle proof should be the same logical handler used by real tray activation, avoiding a fake test-only lifecycle.

Owner-machine visible tray/mouse interaction remains a TA-1A Exit residual and is **not** something Builder may claim passed from CI alone.

---

## 7. Explicit Prohibited Scope

Do not implement or scaffold product behavior for:

- TA-1B before TA-1A UAT;
- recurrence / series / occurrence / exception;
- Reminder;
- Memo;
- Unscheduled;
- Week View;
- recurrence “这一次及以后”;
- Milestones;
- GitHub/AI Track Update;
- Google Calendar sync;
- Launch Target;
- Custom Functions;
- Knowledge / Habit / Finance / Health modules;
- AI Collaboration;
- Plugin / SDK / Page Builder;
- multi-device/cloud sync;
- login/accounts/team/multi-tenant permissions;
- autostart/startup-at-login;
- updater/signing/release service unless strictly required to produce the packaged test artifact;
- completion analytics / streak / scoring;
- generic Todoist/project-management expansion;
- prebuilt future schema tables/columns whose only consumer is TA-1B/Future.

Do not modify frozen Product / Route / Architecture sources from the implementation task. A discovered contract problem is a STOP condition, not permission to rewrite architecture.

---

## 8. Suggested Internal Implementation Order

This is sequencing guidance, not permission to split ownership:

1. Bootstrap minimal Electron/renderer/test/package structure.
2. Establish SQLite location, connection lifecycle, schema v1, migration runner and repository/domain boundary.
3. Implement Track and Plan canonical state + semantic tests, including Vector overlap negative cases.
4. Implement Today derivation + narrow acknowledgement state.
5. Implement direct usable Tracks / Plan Month / Today UI paths.
6. Implement backup/restore and migration safety paths.
7. Implement packaged tray lifecycle.
8. Run focused tests → full tests → packaged Windows integration evidence.
9. Produce Completion Report and push exact final branch state.

Do not optimize visual polish before semantic/persistence gates are green.

---

## 9. Deliverables

Builder must deliver on the Task Branch:

1. Production source code for TA-1A only.
2. Dependency lockfile and reproducible scripts.
3. Automated unit/domain tests for canonical ownership and negative cases.
4. Persistence integration tests for restart, backup/restore, migration/rollback and invalid restore rejection.
5. Packaged Electron lifecycle integration/self-test sufficient to prove close-hide / shared restore handler / real exit on Windows.
6. Minimal Windows CI workflow that reproduces semantic tests + packaging/integration evidence and publishes relevant packaged/test artifacts when useful. Do not build a general release pipeline.
7. User-usable packaged Windows artifact or reproducible packaging output.
8. `docs/tasks/PWB-001/COMPLETION.md` with required evidence and acceptance matrix.
9. Any small implementation documentation required to run/package/test the application.

---

## 10. Engineering Acceptance Gates

### AC-01｜Boot / Entry
A packaged Windows build launches successfully and opens the main window at Today without a dev server.

### AC-02｜Track Semantics
Owner can create and edit a Track, move it among Active / Completed / Archived, and renaming it preserves linked Plan references by stable ID.

### AC-03｜Plan Single Item
Owner can create/edit a single Scheduled Item with optional Track Link and see it on the correct date in Month View.

### AC-04｜Current Vector
Owner can create/edit non-overlapping Vectors. Any create/edit whose inclusive range overlaps an existing Vector is rejected and canonical DB remains unchanged by the failed operation.

### AC-05｜Today Derivation
For a controlled local date, Today shows exactly the effective Current Vector and that day’s single Scheduled Items from canonical Plan state. It does not persist independent copies of those facts.

### AC-06｜Acknowledgement Isolation
Acknowledging a Today source changes only narrow acknowledgement state; restart restores the same-day visual acknowledgement; Plan item fields, Track fields/status, Vector state and source identities remain unchanged.

### AC-07｜Restart Durability
Committed Track/Plan/ack state survives app/DB restart. A deliberately interrupted uncommitted transaction does not appear after reopen and DB integrity remains valid.

### AC-08｜Backup
Manual backup produces an independently openable valid SQLite snapshot containing the expected relationships and integrity check passes.

### AC-09｜Restore Guardrails
Invalid/non-Workbench backup is rejected without changing live canonical state. Valid restore creates a pre-restore safety snapshot, stages and validates replacement, restores expected data, then reopens verified canonical DB.

### AC-10｜Migration / Rollback
A legacy fixture migrates through ordered transaction(s) to current expected schema while preserving data. A deliberately failing migration rolls back schema/version/data changes; app must not continue using a half-upgraded DB. Upgrade path creates a safety backup before migration.

### AC-11｜Packaged Tray Lifecycle
In packaged Windows runtime: tray exists; window close hides without process exit; the shared tray restore handler makes the existing window visible/focused; explicit real exit terminates the process.

### AC-12｜Scope Integrity
Diff contains no TA-1B / Deferred product capability, no second canonical store, no speculative plugin/AI/sync framework, and no silent frozen-contract changes.

### AC-13｜Direct Usability
Tracks, Plan Month and Today can all be exercised through normal app UI with seeded-or-user-entered data; acceptance must not require direct DB editing, hidden CLI mutation, or test fixtures as the only user path.

---

## 11. Product Value Acceptance Boundary

Primary Purpose / Core Value for this increment:

> Owner should be able to keep one low-maintenance desktop workbench resident and quickly understand/edit `what I am advancing long-term → how I have arranged the future → what matters today` without maintaining conflicting copies of state.

Builder and automated tests **cannot** prove this product value.

Builder must make the real path available and may only report engineering readiness. After 05 Engineering / Reality Gate, Owner real-data UAT must decide at minimum:

1. Today 是否真的能快速看清当前局面；
2. Thin Track 字段是否自然；
3. 单次日程 + Current Vector 是否已经形成有价值的 Plan；
4. 维护成本是否足够低；
5. tray 是否让 Workbench 自然长期驻留；
6. 是否存在必须在 TA-1B 前先修的产品结构问题。

The following are product-gate failures, not mere polish, if observed in real UAT:

- Today requires maintaining duplicate data to stay correct;
- Thin Track cannot naturally represent Owner’s real long-term state;
- Plan is materially harder to maintain than the information value it returns;
- Today does not make the current day materially clearer;
- tray lifecycle prevents natural repeated use;
- real personal data cannot be trusted to survive ordinary restart/restore/migration paths.

---

## 12. Validation Contract

Builder may choose exact libraries, but the repository must expose reproducible commands equivalent to the following and record the actual commands/results in Completion Report:

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

If script names differ, provide a one-to-one mapping.

Validation order:

1. focused domain tests;
2. persistence/recovery integration tests;
3. full lint/type/test suite;
4. production renderer/main build;
5. packaged Windows build;
6. packaged lifecycle integration/self-test;
7. inspect resulting artifact and CI evidence.

At minimum test these negative/boundary cases explicitly:

- Vector touching boundary without overlap is accepted where semantically valid; inclusive overlap is rejected;
- Track rename leaves Plan link intact;
- acknowledgement does not mutate source facts;
- uncommitted crash/restart does not leak partial write;
- invalid backup rejected before live replacement;
- failed migration rolls back;
- packaged close does not terminate; real Exit does.

A green dev-mode test suite alone is insufficient.

---

## 13. Git Responsibility

### Start

- Verify current branch is `task/PWB-001-ta1a-first-usable-core`.
- Record `git status` and current HEAD before modifying code.
- Formal Code Base remains `87d1aba19ab67ea8e87c592447d9f982eca79c04`; the task-packet-only commit on this branch is dispatch metadata, not implementation evidence.
- If unknown dirty changes exist, STOP rather than overwrite.

### During

- Keep all PWB-001 implementation on this task branch.
- Do not write directly to `main`.
- Do not force-push or rewrite unknown history.
- Keep unrelated formatting/refactors out of the diff.
- Commit messages should include `PWB-001`.

### Finish

- Commit and push the Task Branch.
- Do **not** merge to `main`.
- Return exact implementation SHA(s), final branch HEAD, and validation evidence.
- If `main` advanced during implementation with potentially overlapping production changes, report it; do not silently rebase/merge unknown changes.

PR creation is optional; exact SHA review is authoritative.

---

## 14. Stop Conditions

STOP implementation and return a bounded finding if any of these occurs:

1. Meeting TA-1A Acceptance requires recurrence, Reminder, Memo, Unscheduled, Week View or another Deferred capability.
2. Frozen Product / Route / Architecture sources materially conflict.
3. A required behavior appears impossible without changing Electron / SQLite / canonical ownership / identity / date / backup / restore / migration / tray contracts.
4. Implementation evidence suggests a frozen contract itself is wrong, not merely the code.
5. Unknown parallel changes would have to be overwritten or destructively rebased.
6. Safe restore cannot be implemented without bypassing validation/safety-snapshot/staging guardrails.
7. A major new architecture/platform abstraction appears necessary solely for hypothetical future work.

Return:

```text
Finding
Impact
Options
Recommendation
Required Owner Decision
```

Do not resolve these by silently expanding scope.

---

## 15. Completion Report Contract

Create `docs/tasks/PWB-001/COMPLETION.md` before handoff.

It must contain:

```text
Task ID
Result: IMPLEMENTED | BLOCKED
Task Branch
Formal Code Base SHA
Task Packet Commit SHA (if known from dispatch handoff)
Implementation Commit SHA before Completion Report
Final Branch HEAD (may be returned in chat if self-referential)
Changed Files / Areas
Implementation Summary
Chosen implementation details:
  - renderer/UI stack
  - SQLite binding/data-access approach
  - packaging approach
  - test approach
Acceptance Matrix AC-01..AC-13: PASS | FAIL | NOT RUN
Validation commands + exact results
Windows CI run / artifact evidence
Known Limitations
Scope Deviations
Unexpected Findings
Expanded-read context, if any, and why
Recommended Next Action: 05 INDEPENDENT REVIEW | REVISION | OWNER DECISION
```

Do not hide failed/not-run gates under a generic “tests passed” statement.

---

## 16. 05 Independent Review Handoff

After Builder pushes Completion Report, dispatch to `05｜代码审核与 UAT` with only the bounded coordinates below:

```text
Repo: zhangchenjia21-dot/Workbench
Task ID: PWB-001
Formal Base: 87d1aba19ab67ea8e87c592447d9f982eca79c04
Task Branch: task/PWB-001-ta1a-first-usable-core
Task Packet: docs/tasks/PWB-001/TASK.md
Completion Report: docs/tasks/PWB-001/COMPLETION.md
Review Target: exact final branch HEAD returned by Builder
```

05 must independently inspect the exact base→target diff, tests, CI/package/runtime evidence and frozen sources. Builder summary alone is not evidence.

05 review minimum:

- Acceptance AC-01..AC-13;
- canonical ownership / Today derivation;
- SQLite durability / backup / restore / migration safety;
- Vector/date semantics;
- packaged Electron tray lifecycle;
- scope leakage into TA-1B / Deferred;
- regression/maintainability adequate for first real personal data;
- Reality Gate readiness;
- design of Owner real-data UAT.

Formal 05 result:

`PASS | PASS_WITH_NOTES | REVISION_REQUIRED | BLOCKED`

If revision is required, return to the same Primary Owner as `PWB-001 / R1`; do not create a new feature task for ordinary review fixes.

05 may recommend `READY FOR OWNER UAT` only after Independent Review + required Reality Gate evidence are sufficient.

---

## 17. TA-1A Exit Residual｜Not Builder-Claimable

Before TA-1A Stage Exit, Owner must perform on the real Windows machine:

```text
notification-area icon actually visible
→ real mouse activation restores/focuses window
→ window close hides to tray
→ tray real Exit terminates app
```

CI/programmatic tray proof does not replace this focused Owner-machine check.

Failure blocks TA-1A Exit and returns to 05 Root Cause; if the frozen host contract is genuinely contradicted, escalate to 03 + Owner + 00 instead of silently changing route.

---

## 18. Dispatch State

`PWB-001 = READY`

Authorized execution target:

`TA-1A First Usable Core Vertical only`

Next lifecycle transition after Builder return:

`IMPLEMENTED → 05 INDEPENDENT REVIEW`
