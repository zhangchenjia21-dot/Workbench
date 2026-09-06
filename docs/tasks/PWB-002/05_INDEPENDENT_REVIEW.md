# 05 Independent Review｜PWB-002 TA-1B Complete V0

Status: **PASS**  
Review target: `5a4a4433569bb80cfec7aea0f6631c3ce91e5a77`  
Production implementation: `066d6601df013173b1aca85b215b87d40453a318`  
Formal Base: `50bebd2b07619e4e06852ad8a20c110be0553315`

> Builder Completion claims were treated as leads only. Acceptance below is based on independent inspection of authority, exact ancestry/diff, production code, tests, CI and packaged runtime evidence.

## Evidence independently reviewed

- `docs/tasks/PWB-002/TASK.md` and AC-01..19.
- Frozen Product / Route / Architecture blobs independently re-read and matched Task manifest: Product `b4ef90d...`, Route `4e55cd...`, Architecture `83c4ef...`; D-005 matched `084e424...` and authorizes TA-1B from integrated TA-1A base.
- Exact `50bebd2... → 066d660...` implementation diff and `066d660... → 5a4a443...` final evidence-only diff.
- Domain contracts, recurrence expander, schema v3, state maintenance / exception / acknowledgement logic, public/UI boundaries.
- Domain tests, persistence/migration/recovery tests, packaged Complete-V0 normal-UI validation.
- Builder-referenced Windows run `34030486124` on implementation SHA.
- Independently discovered exact-final-HEAD Windows run `34030697136` on `5a4a443...`, with npm ci / lint / typecheck / domain / integration / build / package / packaged test / artifact upload all successful.

## AC-01..19 independent result

| Gate | Result | Independent basis |
|---|---|---|
| AC-01 TA-1A regression | PASS | Existing TA-1A tests and packaged UAT-C1 paths remain in the same runner and pass; correction interaction code is preserved. |
| AC-02 Series creation/projection | PASS | Daily/weekly series normal UI exists; dynamic Month/Week/Today/day-detail projection is packaged-tested across boundaries. |
| AC-03 Dynamic expansion/no second truth | PASS | Canonical schema stores `series` + explicit `exceptions`; no future-occurrence truth table. `expandOccurrences` generates only requested range. |
| AC-04 Stable occurrence identity | PASS | Occurrence ID is `seriesId@originalKey`; moved exception substitutes display fields without changing original key. Domain + packaged tests assert this. |
| AC-05 Single-occurrence edit/delete | PASS | `saveException` writes one keyed exception/tombstone; series remains unchanged; unrelated occurrences remain dynamic. |
| AC-06 Whole-series edit/delete | PASS | UI offers only `仅这一次 / 整个循环`; deleteSeries is series-bounded, exceptions cascade, occurrence acknowledgements are series-bounded cleaned. No future-scope API. |
| AC-07 Whole-series + exceptions | PASS | UI warning + required explicit confirmation; backend independently rejects unconfirmed update; confirmed update + exception clear is one transaction; cancel state is packaged-tested unchanged. |
| AC-08 Reminder | PASS | Separate immutable entity and CRUD; date-only + optional local time; exact Today filtering; no acknowledgement/completion semantics. |
| AC-09 Memo | PASS | Separate immutable informational entity and CRUD; display-date Today filtering; no completion semantics. |
| AC-10 Unscheduled | PASS | Separate Plan entity with optional stable Track link; CRUD; excluded from Today; no hierarchy/priority/kanban expansion. |
| AC-11 Week canonical consistency | PASS | Week uses the same state/occurrence projection, normal UI navigation is packaged-tested, Week edit is observed back in Month/Today. |
| AC-12 Today Complete V0 projection | PASS | Today derives Vector + single items + exception-adjusted occurrences + today Reminder/Memo; excludes Unscheduled/future info and persists no duplicate Plan facts. |
| AC-13 Occurrence acknowledgement | PASS | Public acknowledgement accepts only current-date item/occurrence sources; occurrence key remains original identity; series/exception/Track state is unchanged; restart/full graph test preserves ack. |
| AC-14 Date/local wall-time/DST | PASS | Pure Gregorian date operations avoid UTC-midnight modeling; deterministic New York DST process test proves 09:00 wall time remains 09:00 while offset changes; local-date boundary is separately asserted. |
| AC-15 Migration | PASS | v2 production-shaped fixture upgrades by ordered v3 migration after safety snapshot; injected DDL/data failure rolls schema/data/version back and does not continue half-upgraded. |
| AC-16 Complete V0 recovery | PASS | Full graph snapshot/independent open/staged restore/restart is deep-equal; old v2 backup migrates in staging; malformed exception candidate is rejected before live replacement. |
| AC-17 Direct Complete-V0 usability | PASS | Recurrence, Reminder, Memo, Unscheduled and Week interactions are exercised through packaged normal UI; state reads are evidence only, not hidden write paths. |
| AC-18 Packaged Windows host | PASS | Exact packaged Electron runtime remains file-based/no dev server and retains close-hide/shared tray restore-focus/real Exit in the combined packaged suite. |
| AC-19 Scope integrity | PASS | Diff is bounded to frozen TA-1B semantics + necessary schema/tests/UI/docs; no future-scope platform or second host/store was found. |

## Architecture / correctness observations

- Stable identity contract is preserved for existing TA-1A entities and new Series/Reminder/Memo/Unscheduled entities.
- `OccurrenceIdentity = SeriesStableID + OriginalScheduledOccurrenceKey` is implemented directly; moved display date/time does not redefine identity.
- Recurrence expansion is local-calendar/string based. Future occurrences are not materialized as canonical state.
- v3 schema adds only `series`, `exceptions`, `reminders`, `memos`, `unscheduled`; existing v1/v2 DDL is retained and upgraded rather than rebuilt.
- Today continues to be derived; Month and Week are views over the same Plan facts.
- Full V0 restore continues through candidate validation → safety snapshot → staging/migration/validation → canonical replacement/reopen.

## Failure-mode / risk assessment

No blocking defect requiring Builder rework was found.

Non-blocking technical note for later hardening: acknowledgement validation intentionally remains permissive enough to retain legacy/stale rows; a deleted single occurrence can therefore leave a harmless unreachable acknowledgement row until a whole-series edit/delete clears series acknowledgements. This does not create a second truth, cannot make a deleted occurrence reappear, and does not violate an AC, so it is not a TA-1B blocker.

## CI / runtime

- Builder run `34030486124`: success on implementation SHA `066d660...`.
- Exact review HEAD independently triggered run `34030697136`: success on `5a4a443...`; every required validation/package step completed successfully.
- Packaged evidence records `win32`, Electron 40, SQLite 3.50.4 and PASS for TA-1A regression + TA-1B Complete-V0 paths.

## Decision

**PASS**

Engineering / automated Reality acceptance for TA-1B is complete. This is not Complete V0 Product PASS or Stage Exit. Next mandatory gate is Owner Complete V0 UAT. Do not merge/advance to TA-2 until Owner UAT and 00 Stage decision.