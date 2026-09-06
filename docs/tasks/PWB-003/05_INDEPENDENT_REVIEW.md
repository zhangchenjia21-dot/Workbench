# 05 Independent Review｜PWB-003 TA-2 Reliability Hardening

Status: **PASS_WITH_NOTES**

Review target: `3e946ade25f1932f90a601314f96efdaccd79d5a`
Formal base: `d990ef0f1807a2a0cacd91ba9447ebef5be692b8`
Audit-first reproduction: `d4a0144f5b33e8004a19f3cb28f7b5478e450d5b`
Production fix: `00a54f587159c9ef18d3444941f0fd67ff3584cf`

Builder claims were treated as leads only. Review independently inspected Task/Audit/Completion, exact ancestry and diffs, the 13-line production change, focused reliability tests, legacy regression, packaged Windows evidence, exact-final-HEAD CI, branch state and main state.

## Independent finding decision

A-01 is a real bounded reliability defect and the production fix is warranted.

Before the fix, acknowledging an occurrence then persisting a single-occurrence tombstone left an acknowledgement row. Tombstone projection correctly hid the occurrence across Today/Month/Week, restart and restore, but the existing accepted `saveException(seriesId, originalKey, value)` command could later re-edit the same original occurrence key and make the old visual acknowledgement reachable again. That crosses the semantic delete boundary and violates acknowledgement isolation/bounded-state expectations even though the current GUI has no revive button.

The fix is appropriately minimal: only `saveException` changed. When saving a tombstone, or when re-editing a key whose current exception is a tombstone, it deletes acknowledgement rows whose exact sourceId is `occurrence:${seriesId}@${originalKey}` in the same Store transaction. Ordinary non-deleted edits retain existing acknowledgement semantics. No schema, DDL, public API, UI, Bootstrap, frozen authority, identity or recovery contract changed.

Focused regression verifies: delete leaves zero matching acknowledgement rows; restart/backup/restore do not revive state; re-edit of an old tombstone clears historical stale acknowledgement; invalid edit rolls the cleanup back; unrelated series/occurrences/items retain their acknowledgements; ordinary edit of a live occurrence retains acknowledgement.

## H-AC-01..12

- H-AC-01 PASS — AUDIT A-01..09 covers all required surfaces and distinguishes one finding from no-finding results.
- H-AC-02 PASS — stale acknowledgement independently reproduced and evidence supports FIXED rather than no-fix.
- H-AC-03 PASS — committed full V0 restart and nine-table uncommitted crash/read-isolation/integrity checks pass.
- H-AC-04 PASS — existing v1/v2 migration success/failure, safety backup, full-graph restore, invalid candidate, reopen compensation and fatal path remain green.
- H-AC-05 PASS — bounded recurrence edit/move/delete/whole-series sequences preserve original identity and exception scope.
- H-AC-06 PASS — acknowledgement cleanup is exact-source and transactional; no wrong-source attachment observed after repeated operations.
- H-AC-07 PASS — Month/Week/Today remain projections over the same canonical graph through mutation/restart/restore.
- H-AC-08 PASS — 115 deterministic state operations plus six packaged-session rounds return to asserted baseline without duplicate/drift/fatal errors.
- H-AC-09 PASS — packaged six-cycle close-hide/restore-focus uses one logical window and real Exit terminates normally; tray click/double-click is real-object event injection, not physical notification-area mouse proof.
- H-AC-10 PASS — previously accepted TA-1A/TA-1B domain/integration/packaged paths remain green.
- H-AC-11 PASS — production diff is only 13 lines in existing L2; no product capability, schema, platform, unrelated refactor or frozen-contract change.
- H-AC-12 PASS_WITH_NOTE — known limits are explicitly documented.

## CI / review-target integrity

Exact review target `3e946ade25f1932f90a601314f96efdaccd79d5a` is the current task-branch head at review time and its Windows run `34034288695` completed successfully. Job `101489408140` passed npm ci, lint, typecheck, domain tests, integration tests, build, Windows packaging, packaged tests and artifact upload. `main` remained at Formal Base `d990ef0f1807a2a0cacd91ba9447ebef5be692b8` during review.

## Notes / accepted limitations

1. Historical backups may contain acknowledgement rows for tombstoned occurrences that have never been touched since this fix. They remain non-projecting/invisible. They are cleaned precisely if that tombstone is deleted again/re-edited, while whole-series edit/delete continues its existing series-wide cleanup. No startup/restore full-table sweep is added; this is an acceptable risk/complexity tradeoff for V0.
2. Reliability evidence is bounded (115 deterministic state operations and six packaged GUI rounds), not a multi-day soak, memory benchmark or hardware-power-loss proof.
3. Tray automation injects click/double-click on the real packaged Tray object and exercises production handlers; it is not new evidence of a physical notification-area mouse action. That physical path was already Owner-tested in TA-1A and production tray code did not change here.

## Owner retest decision

**No focused Owner retest required.**

Reason: the production behavior change is canonical acknowledgement cleanup at a deletion/tombstone re-edit boundary. The current normal GUI had no path that visibly exhibited the pre-fix reattachment; its user-visible delete behavior is unchanged. Packaged GUI regression already exercises acknowledgement → single-occurrence delete and independently asserts graph/ack cleanup, while all accepted user paths remain green. A human mouse retest would not add meaningful evidence for this specific root fix.

## Decision

**PASS_WITH_NOTES**

TA-2 Engineering / Reliability Hardening gate is accepted. This does not declare TA-2 Stage Exit, TA-3 readiness or V0 Product PASS. Return to 00 for Stage Exit / next-stage decision; do not route through 04.
