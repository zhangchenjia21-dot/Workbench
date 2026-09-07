# 05 Independent Review + Product Reality Review｜Autonomous Productization

Status: **ENGINEERING PASS / PRODUCT REALITY READY FOR OWNER UAT**

Review target: `c2d9c0e7130aed63118cf15f611adac612a74e47`
Production implementation: `7b39d4b668d92a3913d6352d7235b84f28849a10`
Base: `5fba3cb0ad3016f5c2f259e668f97699f7c7c80a`
Branch: `product/github-project-updates`

> Builder shaping / Completion were treated as leads only. This review independently inspected implementation ancestry/diff, productization docs, source contracts, GitHub adapter, SQLite v4 migration/validation, project-update transaction flow, async lifecycle isolation, UI confirmation path, tests, real GitHub proof, packaged evidence, and final-HEAD Windows CI.

## Engineering verdict

**PASS**. No blocking defect or frozen-contract violation found.

- Base → implementation is one bounded external-information vertical: GitHub public read-only source → locally persisted evidence snapshot → Today/Sources projection → editable proposal → explicit Track confirmation.
- Implementation → final review target contains only Completion/evidence/document clarification; no further production code changes.
- Electron remains the host; SQLite remains the only per-user canonical store. v4 adds only `project_sources` and `project_updates`; v1-v3 DDL and existing identity/recovery contracts are preserved.
- External facts and Owner Track facts remain separate. Unconfirmed refresh/seen operations do not mutate Track/Plan canonical state.
- Track acceptance is transactional and checks stale update, source identity, full expected Track state, and latest update before writing. It changes only Track `realState`/`direction` for an existing Track, or creates a new Active Track after explicit confirmation; goal/phase/lifecycle/Plan are not inferred.
- Source repository identity is normalized and additionally pinned by GitHub numeric repository ID after first successful snapshot.
- Restore/close increments a generation token; pending async fetch results from the old generation are rejected before capture. Same-source requests are coalesced. Disconnect during an in-flight request cannot resurrect the source.
- Failed refresh preserves the last valid snapshot and core Personal State while surfacing stale/error state.
- Backup/restore validation includes the v4 source graph and rejects mismatched/tampered source payloads. Existing staging/safety-snapshot Store behavior is unchanged.
- Final review HEAD CI run `34080408707` completed successfully with npm ci, lint, typecheck, domain, integration, build, Windows package, packaged tests and artifact upload all green.

## Evidence strength

Strong evidence includes:

- real packaged Windows application using official GitHub API without network fixture;
- real public Workbench repository facts captured from main, with five commits, zero open PRs and no current-SHA run rather than inventing a green state;
- normal UI cancel → no core mutation; explicit editable confirmation → Track creation/link;
- disconnect preserving Track; full backup/restore/restart preserving source and core graph;
- deterministic tests for dedupe, seen state, stale proposal rejection, manual Track edit conflict, source identity mismatch, network failure, async restore/close/disconnect isolation, 20-update bound, v3→v4 migration/rollback and old-backup restore;
- full prior V0 packaged regression retained.

The retained first calendar-click timeout is appropriately documented as an unreproduced GUI timing observation. The original assertions were not weakened, and later local + CI runs passed.

## Product Reality assessment

### Does this reduce repetitive copying?

**Yes, for GitHub-backed project status.** The system now observes new mainline commits / open PRs / current-SHA Actions automatically after one source connection, keeps provenance, deduplicates identical evidence, and surfaces new changes without requiring Owner to manually copy them into Workbench. This closes a real input-side gap that Calendar/Todo alone cannot address.

### Is there value beyond Calendar/Todo?

**Yes, but bounded.** The incremental value is not another task list; it is provenance-aware external-state ingestion plus Owner-controlled promotion into long-term Track state. Calendar/Todo generally require the Owner to already know and manually enter the state. Here the system first notices external changes and then asks whether they should alter Personal State.

### Are the rule summaries honest/useful?

**Mostly yes and intentionally conservative.** The rule layer reports current mainline commit, bounded open PR counts, draft distinction and current-SHA Actions without inferring completion, personal progress or Product PASS. Missing current-SHA runs are shown as missing rather than green.

Non-blocking wording note: an open non-draft PR is presented as “待处理/等待处理”. That is useful as an attention heuristic but is not proof that the Owner personally must review or act on that PR. If real use makes this feel too directive, wording should be narrowed to “开放非草稿 PR / 可评审 PR”; no engineering correction is required before UAT.

### Is the current public-mainline scope enough for a first vertical?

**Yes.** It is enough to test the core product hypothesis: whether Workbench becomes lower-maintenance and more valuable when it notices real external change and preserves evidence before asking for a Personal State update. It is not enough for a comprehensive project model, and the UI/docs correctly state that limitation.

The strongest next-value gap is semantic project context: decisions, blockers, Task/Completion/Review documents and discussion meaning. Expanding raw source count before improving semantic signal would likely add noise rather than proportional value.

### Is Owner control preserved?

**Yes.** Refresh and evidence capture do not mutate Track canonical state; seen state only affects source-update disposition. Track changes require an explicit proposal and confirmation. Existing Track edits are conflict-checked, stale updates are rejected, source identity is checked, and restore/close async isolation prevents old network results from writing after state replacement. No GitHub write-back, credential capture or ChatGPT scraping exists.

## Product acceptance boundary

Engineering success and a successful real GitHub packaged proof do **not** establish Product PASS. The remaining question is experiential: does the Owner actually find the Today project card, evidence hierarchy and Track proposal useful enough to keep connected, and does it reduce maintenance rather than create another inbox?

Required next gate: **focused Owner Product Reality UAT** using one or two real public project repositories and normal mouse/UI interaction.

Suggested UAT checks:

1. Connect a real public repo you actively care about and inspect whether Today gives useful information without opening GitHub first.
2. Open evidence and judge whether the summary is trustworthy and whether the raw commit/PR/Actions links are enough to verify it quickly.
3. Mark the update seen, refresh again, and confirm unchanged evidence does not nag again.
4. Create or target a real Track; edit the proposed real state/direction; cancel once and confirm once. Verify the system feels like Owner-controlled promotion rather than automatic rewriting.
5. Trigger or encounter another project change if practical, then judge whether the new update reduces manual copying and whether the suggested Track text is worth reviewing.
6. Disconnect/reconnect or briefly lose network and confirm stale/error behavior remains understandable and existing Personal State still feels safe.

Product Reality PASS should require the Owner to answer yes to the central question: “Would I leave this source connected because it saves me more effort/context switching than it creates?”
