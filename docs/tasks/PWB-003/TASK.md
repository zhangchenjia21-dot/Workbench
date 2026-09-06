# TASK｜PWB-003｜TA-2 Reliability Hardening

Status: READY  
Type: HARDENING / AUDIT-FIRST  
Stage: TA-2｜UAT Correction / Reliability Hardening  
Risk: R3｜High Risk  
Primary Owner: Codex  
Independent Review Owner: 05｜代码审核与 UAT  
Implementation Repository: `zhangchenjia21-dot/Workbench`  
Formal Code Base: `main@d990ef0f1807a2a0cacd91ba9447ebef5be692b8`  
Task Branch: `task/PWB-003-ta2-reliability-hardening`  
Task Packet Path: `docs/tasks/PWB-003/TASK.md`

> **Audit first. Fix only demonstrated findings. No production-code change is a valid successful outcome.**
>
> This Task does not authorize new product capability. It exists to decide whether the integrated Complete V0 is reliable enough to proceed toward final V0 Product Acceptance.

---

## 1. Outcome

Produce bounded, reproducible evidence that the integrated Complete V0 remains internally consistent under repeated use, restart/crash, migration/restore, recurrence exception/acknowledgement operations, date boundaries, and desktop lifecycle.

If the audit exposes a real defect, apply the smallest root fix that preserves frozen product/architecture semantics and add regression coverage.

If no production defect is found, finish with evidence and `NO_PRODUCTION_CHANGE`; do **not** manufacture a code change merely to make TA-2 look active.

Builder's maximum terminal state:

- `HARDENED_WITH_FIXES / READY FOR 05 INDEPENDENT REVIEW`, or
- `NO_PRODUCTION_CHANGE / READY FOR 05 INDEPENDENT REVIEW`.

Builder may not declare TA-2 Stage Exit, TA-3 readiness, or V0 Product PASS.

---

## 2. Why Now

TA-1A and TA-1B have passed Independent Review and Owner UAT and are integrated. TA-2 is the frozen reliability boundary before final V0 Product Acceptance.

The current question is not “what feature should be added?” but:

> Can the current Complete V0 be trusted through repeated real use and failure/recovery paths without data loss, Today/Plan truth divergence, recurrence identity drift, or desktop-lifecycle degradation?

A non-blocking TA-1B review note also remains to be audited: deleting one recurring occurrence may leave an unreachable stale acknowledgement row. This is an audit lead, not a predetermined bug fix.

---

## 3. Authority / Source Manifest

Authority from high to low:

1. Owner current instruction — bounded TA-2 reliability hardening; audit/regression first; only fix real findings; no-change is valid.
2. `Vibe-Coding/workbench/current/开发路线.md`
   - status: ROUTE-FROZEN / CURRENT ROADMAP
   - blob: `4e55cddefb185c65e16da1519cd3d251c2f030fe`
   - TA-2 defines focused root fixes, adjacent state/failure audit, restart/migration/restore regression, appropriate repeated-use checks, tray/window regression, known limitations.
3. `Vibe-Coding/workbench/current/项目状态.md`
   - stage: TA-2 AUTHORIZED FOR DISPATCH
   - blob: `163e3d556fd48bc79b37e57d578e14f13c5de497`
4. `Vibe-Coding/workbench/decisions/D-006_TA-1BStageExit与TA-2Authorization.md`
   - status: APPROVED / CURRENT
   - blob: `11459b376a1ed81bd6a8abf74534b92795609c91`
5. Integrated implementation facts at exact Formal Base `d990ef0f1807a2a0cacd91ba9447ebef5be692b8`.
6. `docs/tasks/PWB-002/05_INDEPENDENT_REVIEW.md`
   - review status PASS
   - blob: `99cf930ffa9b7fb6d7a1522e27cfc92099aa5427`
   - carries the stale-acknowledgement hardening note.
7. `docs/tasks/PWB-002/状态与失败矩阵.md`
   - blob: `d745696188002291d7de9d66f47384f019bd0ef4`
   - starting failure/state map for Complete V0.
8. Existing PWB-001/PWB-002 accepted tests, UAT corrections, packaged evidence, and current production code.

Frozen Product / Architecture / identity / date / persistence / backup / restore / tray contracts remain unchanged. If a finding suggests one of those contracts is wrong rather than implementation being wrong, STOP and escalate instead of silently changing the contract.

---

## 4. Read First

Read in this order:

1. This Task Packet.
2. Frozen Route TA-2 section.
3. Current `项目状态.md` and D-006.
4. `docs/tasks/PWB-002/05_INDEPENDENT_REVIEW.md`.
5. `docs/tasks/PWB-002/状态与失败矩阵.md`.
6. Current production code and tests at Formal Base, especially:
   - recurrence expansion / exception maintenance / acknowledgement handling;
   - Today / Month / Week projection;
   - SQLite connection, migrations, backup/restore;
   - packaged tray/window lifecycle;
   - existing domain/integration/packaged test scripts.
7. PWB-001 UAT correction acceptance/evidence only as needed to protect already accepted UX regressions.

Do not read or redesign Future scope. Expand context only when a concrete audit question requires it, and record why.

---

## 5. Core Invariants

### INV-01｜No New Product Capability
TA-2 adds no new product module, workflow, planning semantic, or user promise.

### INV-02｜Canonical Ownership
Tracks/Plan remain authoritative business state. Today, Month and Week remain projections over the same canonical state; no repair may introduce a second live truth.

### INV-03｜Stable Identity
Existing immutable object IDs and occurrence identity `SeriesStableID + OriginalScheduledOccurrenceKey` remain stable through edit/move/delete/restart/restore.

### INV-04｜Acknowledgement Is Narrow
Acknowledgement remains visual state only. It cannot change Plan/Track/series/exception semantics or create completion history.

### INV-05｜Recovery Safety
Migration/restore keeps existing safety-backup, staging, validation, transactional rollback, canonical replacement/reopen semantics. Do not weaken recovery guardrails to make tests pass.

### INV-06｜Accepted UX Does Not Regress
TA-1A/UAT-C1 and TA-1B accepted behavior remains intact, including Month title-first rendering, day detail/right-click/same-day delete flows, Current Vector semantics, Week View, Today clarity and complete V0 Plan entities.

### INV-07｜Evidence Before Fix
Do not modify production behavior before documenting a reproducible finding, impact, affected invariant and focused regression case, except for harmless test/instrumentation scaffolding that does not alter production behavior.

---

## 6. Authorized Work｜Audit First

### 6.1 Adjacent State / Failure Audit

Create `docs/tasks/PWB-003/AUDIT.md` before or alongside any production fix.

For each audited path record:

```text
Path / State Transition
Expected invariant
Reproduction / test
Observed result
Finding: YES / NO
Impact
Fix required: YES / NO
Reason
Regression added
```

Minimum audit surfaces:

- recurrence series → dynamic occurrence → exception → acknowledgement;
- single-occurrence edit/move/delete;
- whole-series edit/delete with exceptions;
- single Scheduled Item acknowledgement and deletion;
- Reminder / Memo / Unscheduled lifecycle where adjacent state may survive deletion/restore;
- Month / Week / Today consistency after mutations;
- restart/crash during or around canonical writes;
- migration and restore of a full Complete-V0 graph;
- repeated tray hide/restore/exit lifecycle;
- bounded repeated-use sequence in one running application/session where practical.

### 6.2 Specific Audit Lead｜Stale Occurrence Acknowledgement

Independently reproduce and assess the TA-1B review note:

```text
acknowledge recurring occurrence
→ delete only that occurrence
→ inspect canonical acknowledgement state
→ restart / project Today / Month / Week
→ backup + restore where relevant
```

The Task does **not** pre-decide cleanup.

A fix is warranted only if evidence shows the stale row creates a meaningful reliability/integrity cost, such as:

- stale state can later become reachable under valid V0 operations;
- restore/migration/re-edit can attach it to the wrong visible occurrence;
- it accumulates materially or breaks graph invariants;
- it creates confusing or divergent user-visible acknowledgement state;
- it violates an existing bounded-state expectation already present in accepted semantics.

If it is proven permanently unreachable, harmless, bounded enough for V0, and cleanup adds more risk than value, document `NO FIX REQUIRED` with evidence. That is a valid result.

If cleanup is implemented, it must be occurrence-bounded and transactional, must not alter series/exception identity, and must not remove acknowledgements for unrelated occurrences/items.

### 6.3 Restart / Crash Regression

Exercise committed and deliberately uncommitted state across representative Complete-V0 operations.

At minimum prove:

- committed Track/Plan/series/exception/Reminder/Memo/Unscheduled/ack state survives restart;
- interrupted uncommitted mutation does not leak partial canonical state;
- `PRAGMA integrity_check` remains valid after the tested crash/reopen path;
- no projection uses a partially updated graph.

Do not invent OS-level destructive crash tooling beyond what is necessary to reproduce the existing durability contract safely in temp/test data.

### 6.4 Migration / Restore Full-Graph Regression

Use production-shaped fixtures / temp DBs to verify:

- supported older schema upgrades through ordered migrations;
- failed migration rolls back schema/version/data and does not continue half-upgraded;
- pre-upgrade safety backup remains valid;
- full Complete-V0 graph backup can be independently opened/validated;
- restore still performs validation → safety snapshot → staging/migration if needed → validation → replace/reopen;
- recurrence series/exceptions, Reminder, Memo, Unscheduled, Track links and acknowledgements remain consistent after restore;
- rejected restore candidate does not mutate the live canonical DB.

### 6.5 Identity / Exception / Acknowledgement Stress Regression

Build a deterministic bounded sequence that repeatedly combines valid V0 operations, such as:

- create weekly/daily series;
- acknowledge an occurrence;
- move one occurrence;
- delete one occurrence;
- edit whole series with existing exceptions and confirm clear policy;
- restart;
- create/edit/delete single items;
- backup/restore;
- re-query Month/Week/Today.

Use enough iterations to expose state drift without creating an unbounded soak test. A deterministic repeated sequence of at least 25 state transitions/iterations is sufficient unless evidence suggests more is needed.

After the sequence, assert canonical identities, visible projections, acknowledgement keys and DB integrity against an expected state model.

### 6.6 Month / Week / Today Canonical Consistency

For controlled local dates and mutations, prove:

- a canonical Plan change appears consistently in Month, Week and Today where applicable;
- deleted/moved occurrence behavior is identical across views;
- Reminder/Memo appear in Today only on their intended date;
- Unscheduled never leaks into Today;
- Current Vector remains Plan-owned and unaffected by acknowledgement;
- no view persists its own competing business fact.

### 6.7 Tray / Window Lifecycle Regression

On packaged Windows runtime, repeat close → hidden/process alive → restore/focus existing window cycles multiple times, then real Exit.

Prove:

- no duplicate main-window accumulation;
- restore still targets the existing logical main window;
- repeated close/restore does not corrupt application state;
- real Exit terminates normally.

A bounded cycle count is enough; do not turn this into a performance project.

### 6.8 Long-session / Repeated-use Appropriate Check

Run at least one bounded session that exercises repeated navigation and state operations without restarting after every action.

Look for:

- state/UI drift;
- duplicated projection entries;
- stale selection/detail state pointing at deleted objects;
- increasing unreachable canonical rows where the growth is semantically unintended;
- window/tray duplication;
- unhandled exceptions or fatal logs.

This is reliability evidence, not a benchmark. Do not add telemetry/product analytics.

---

## 7. Fix Authorization

A production fix is allowed only when `AUDIT.md` contains a reproducible real finding.

For each fix:

1. state the violated invariant / user-visible reliability impact;
2. add a focused failing regression or reproduction first where practical;
3. implement the smallest root fix;
4. rerun adjacent-state tests plus full existing regression;
5. record before/after evidence.

Preferred correction order:

```text
data/state bug
→ root transactional/domain fix
→ adjacent cleanup if required
→ focused regression
```

Avoid “cleanup while here”, refactor-for-style, framework extraction or schema redesign.

DDL/schema-version change is strongly disfavored. It is allowed only if a demonstrated reliability finding cannot be safely repaired without it and the change preserves all frozen semantics; then migration/rollback/restore evidence is mandatory. Any change to canonical ownership, identity or product semantics is a STOP condition.

---

## 8. Explicit Non-scope

Do not add or scaffold:

- any new product module;
- recurrence `这一次及以后`;
- new recurrence modes beyond frozen V0;
- completion history / streak / scoring;
- Milestones;
- AI / GPT / Codex-assisted Track maintenance;
- GitHub / Google Calendar sync;
- Custom Functions / Launch Target;
- Knowledge / Habit / Finance / Health;
- AI Collaboration;
- Plugin / SDK / Page Builder;
- multi-device / cloud sync;
- telemetry / analytics / monitoring product;
- updater/signing/autostart/release platform;
- performance optimization without a demonstrated reliability problem;
- broad UI redesign or new convenience workflow.

Do not change accepted Product / Route / Architecture sources.

---

## 9. Acceptance Gates

### H-AC-01｜Audit Completeness
`AUDIT.md` covers every minimum surface in §6 with reproducible evidence and explicitly distinguishes findings from observations/no-issue results.

### H-AC-02｜Stale Acknowledgement Decision Is Evidence-Based
The deleted-single-occurrence acknowledgement note is independently reproduced or disproven. The Task records `FIXED`, `NO FIX REQUIRED`, or `NOT REPRODUCIBLE` with concrete evidence and regression coverage appropriate to the conclusion.

### H-AC-03｜Restart / Crash Integrity
Representative Complete-V0 committed state survives restart; an interrupted uncommitted mutation does not become canonical; integrity remains valid; no partial graph appears in projections.

### H-AC-04｜Migration / Restore Graph Integrity
Supported migration and valid restore preserve the complete V0 relational/identity graph. Failed migration and invalid restore leave canonical state safe and usable according to the existing recovery contract.

### H-AC-05｜Recurrence Identity / Exception Stability
Repeated edit/move/delete/whole-series operations preserve original occurrence identity rules, exception scope and unrelated series/occurrences.

### H-AC-06｜Acknowledgement Isolation
After repeated occurrence/item operations, acknowledgements never mutate Plan/Track/series/exception facts and never attach to the wrong visible source. Any intentionally retained unreachable row is documented and proven harmless.

### H-AC-07｜Month / Week / Today Consistency
After representative mutations, restart and restore, Month/Week/Today resolve from the same canonical facts with no truth fork or stale visible projection.

### H-AC-08｜Repeated-use Stability
The bounded repeated-use sequence completes without state drift, duplicate logical objects, integrity failure, or unhandled fatal error. Expected final canonical state is asserted, not merely eyeballed.

### H-AC-09｜Packaged Desktop Lifecycle Regression
Packaged Windows close/hide/restore/focus cycles remain stable across repeated cycles and real Exit terminates normally without duplicate main-window behavior.

### H-AC-10｜TA-1A / TA-1B Regression
All previously accepted user paths and semantics remain green. In particular no regression to TA-1A UAT corrections, recurrence/Reminder/Memo/Unscheduled/Week, Today clarity, backup/restore, migration, Vector overlap, Track linkage or tray behavior.

### H-AC-11｜Scope Integrity
Diff contains no new product capability, speculative platform, future schema, unrelated refactor or frozen-contract change. If result is `NO_PRODUCTION_CHANGE`, evidence/docs/tests-only changes are allowed and explicitly identified.

### H-AC-12｜Known Limitations / Recovery Documentation
Completion clearly distinguishes fixed findings, accepted non-blocking limitations, unreproduced hypotheses, and recovery behavior that Owner/05 should know before TA-3.

---

## 10. Validation Contract

Reuse the repository's existing validation stack; do not create a second test framework.

Minimum full regression commands at current base:

```text
npm ci --no-audit --no-fund
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run package:win
npm run test:packaged
```

Add focused hardening tests/scripts only where they make the audit reproducible. They should be callable through the existing test/package flow where practical.

Validation order:

1. audit/reproduction of each risk surface;
2. focused failing test for any actual finding;
3. root fix if warranted;
4. focused regression;
5. full domain/integration regression;
6. build/package;
7. packaged Windows repeated-use/tray regression;
8. final `git diff --check` and scope review.

For a `NO_PRODUCTION_CHANGE` result, all applicable audit and full-regression evidence is still mandatory.

---

## 11. Deliverables

Required on the Task Branch:

1. `docs/tasks/PWB-003/AUDIT.md`.
2. Focused regression tests/evidence for discovered findings or audited high-risk paths.
3. Production code changes **only if justified by a documented finding**.
4. `docs/tasks/PWB-003/COMPLETION.md`.
5. Windows packaged/CI evidence sufficient for 05 to independently verify the hardening claim.
6. Small known-limitations/recovery documentation update only if audit changes what must be communicated.

Do not rewrite historical PWB-001/PWB-002 evidence.

---

## 12. Completion Report Contract

`docs/tasks/PWB-003/COMPLETION.md` must include:

```text
Task ID: PWB-003
Result:
  HARDENED_WITH_FIXES | NO_PRODUCTION_CHANGE | BLOCKED
Task Branch
Formal Base SHA
Task Packet Commit SHA
Audit conclusion
Finding table:
  ID / reproduction / impact / decision / fix SHA if any
Production change summary or explicit NONE
Changed files / areas
H-AC-01..12 matrix
Exact focused validation results
Exact full regression results
Windows packaged / CI evidence
Known limitations
Scope deviations
Unexpected findings
Recommended next action: 05 INDEPENDENT REVIEW | OWNER/ARCHITECTURE DECISION
Implementation SHA (if production code changed)
Exact final branch HEAD
```

Do not label an observation a defect without reproduction/impact evidence. Do not hide `NOT RUN` validation behind a generic PASS statement.

---

## 13. Git Responsibility

### Start

- Verify branch `task/PWB-003-ta2-reliability-hardening`.
- Verify packet branch ancestry starts from exact Formal Base `d990ef0f1807a2a0cacd91ba9447ebef5be692b8`.
- Record `git status` and HEAD before work.
- STOP on unknown dirty/parallel changes rather than overwriting them.

### During

- Commit only on this task branch.
- No force push/history rewrite.
- No merge to `main`.
- Keep audit/test-only commits distinguishable from production-fix commits where practical.
- Commit messages include `PWB-003`.

### Finish

- Push exact final branch state.
- Return exact production-fix SHA(s), or explicitly `Production change: NONE`.
- Return exact final branch HEAD and CI/runtime evidence.
- Do not merge `main`.

---

## 14. Stop Conditions

STOP and return a bounded finding if:

1. a demonstrated defect requires changing frozen product semantics, canonical ownership, occurrence identity, date/time contract, or core recovery contract;
2. a proposed fix requires a new product capability to make existing V0 reliable;
3. safe migration/restore cannot be preserved;
4. unknown parallel changes must be overwritten or destructively rebased;
5. audit reveals real personal-data corruption/loss risk whose repair scope exceeds a focused TA-2 fix;
6. a schema redesign/platform abstraction appears necessary rather than a bounded reliability repair.

Return:

```text
Finding
Reproduction
Impact
Options
Recommendation
Required Owner / Architecture Decision
```

---

## 15. Direct 05 Handoff

After completion and push, hand **directly to 05｜代码审核与 UAT**. Do not return to 04 for another routing pass.

Handoff coordinates:

```text
Repo: zhangchenjia21-dot/Workbench
Task: PWB-003｜TA-2 Reliability Hardening
Formal Base: d990ef0f1807a2a0cacd91ba9447ebef5be692b8
Branch: task/PWB-003-ta2-reliability-hardening
Task Packet: docs/tasks/PWB-003/TASK.md
Audit: docs/tasks/PWB-003/AUDIT.md
Completion: docs/tasks/PWB-003/COMPLETION.md
Review Target: exact final branch HEAD returned by Builder
```

05 must independently verify:

- audit completeness and whether claimed findings/no-findings are supported;
- production fixes are root-cause, bounded and warranted;
- no-change is accepted when evidence supports it;
- restart/crash/migration/restore integrity;
- recurrence identity/exception/acknowledgement behavior;
- Month/Week/Today canonical consistency;
- repeated-use and packaged tray/window regression;
- TA-1A/TA-1B regression and scope integrity.

If production behavior changed, 05 decides whether a focused Owner retest is required and scopes it only to affected behavior plus adjacent regression.

Formal 05 result:

`PASS | PASS_WITH_NOTES | REVISION_REQUIRED | BLOCKED`

After 05 PASS (and any required focused Owner retest), return to **00｜项目总控** for TA-2 Stage Exit and the decision whether TA-3 V0 Acceptance may begin.

---

## 16. Dispatch State

```text
TA-1B = PASS / INTEGRATED
PWB-003 = READY
TA-2 = AUTHORIZED
TA-3 = NOT AUTHORIZED
```

Next chain:

`Codex audit/hardening → 05 Independent Review → required focused Owner retest only if behavior changed → 00 Stage Exit / TA-3 decision`
