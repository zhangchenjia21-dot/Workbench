# 05 Independent Re-review｜Private GitHub Sources

Status: **ENGINEERING PASS / PRODUCT REALITY PENDING OWNER UAT**  
Review target: `744c2b8cacb1f1a99ee81ef36a9614c88824b18f`  
Private-source production implementation: `72ad005000196514a79dc62539815f83b7ac2466`  
Prior public-source productization review: preserved at `docs/productization/05_INDEPENDENT_REVIEW.md`

## Scope independently reviewed

This re-review covers the Owner-authorized private-repository correction only. The prior public-only Engineering PASS is not treated as automatic acceptance of authentication/private-data behavior.

Reviewed:

- `docs/productization/私有仓库连接修订.md`
- production diff `c2d9c0e... -> 72ad005...`
- credential reader, GitHub API reader, login boundary, Bootstrap IPC, renderer login/private-data disclosure
- `测试/GitHub登录测试.ts` and existing project-source tests
- redacted real packaged private-repository proof
- Windows CI at production-equivalent `3f34a4d...`
- exact-final-HEAD Windows CI run `34082031689`
- `72ad005... -> 744c2b...` closeout diff (docs/evidence/review only; no further production change)

## Independent findings

### 1. Credential boundary — PASS

- GCM remains the credential owner; Workbench adds no token field or persistent token store.
- Token retrieval occurs in the Electron main-process path and is passed only as an Authorization header to fixed `https://api.github.com/repos/<normalized owner/repo>...` requests.
- Redirects are rejected, arbitrary URLs/queries are rejected by repository parsing, and renderer IPC exposes only account-status/login operations, not token material.
- GCM child-process errors are normalized rather than forwarding stdout/stderr/cause, reducing credential leakage through logs/errors.
- Fixture tests assert the token does not enter returned project snapshots/status objects.

No blocking credential-leak path was found in the reviewed implementation.

### 2. GCM / browser login practicality — PASS WITH NOTE

The implementation uses Git for Windows / Git Credential Manager and provides explicit Owner-triggered browser login. Background refresh never initiates interactive login. Standard Windows Git path is preferred with PATH fallback.

Real packaged evidence independently records successful reuse of the Owner machine's existing GCM login to read a private repository, so this is not only a mocked design.

Non-blocking note: token retrieval currently relies on the GCM credential selected for `github.com` rather than an explicit per-source account selector. This is adequate for the demonstrated Owner environment; multiple GitHub accounts may require future UX/credential disambiguation if it becomes a real Owner problem.

### 3. Private-data / backup boundary — PASS

Private repository facts intentionally become local canonical source snapshots and therefore are included in normal SQLite backup/restore. The connection UI explicitly says this. Tokens are not part of the snapshot schema and are not present in backup payloads.

The existing single SQLite ownership, stable IDs, schema/restore contracts and Owner-confirmed Track mutation boundary remain unchanged.

### 4. Permission/network failure isolation — PASS

401/404 produce explicit authentication/access errors. 403/404 on Actions is treated as verification unavailable rather than success. Failed refresh preserves the last good snapshot and canonical Personal State. Existing async generation isolation and restore/close behavior are unchanged.

### 5. Product Reality impact — POSITIVE, OWNER UAT STILL REQUIRED

This correction materially changes Product Reality because the Owner identified private repositories as the primary real GitHub source. The public-only implementation could not satisfy that need; the private-source path removes that mismatch while preserving explicit confirmation before Track mutation.

Engineering evidence proves the real private repository can flow through packaged UI into a reviewed/edited Track and survive disconnect/backup/restore/restart. It does not prove that the resulting project summary is useful enough for sustained Owner use. Final Product Reality therefore remains an Owner decision.

## CI / runtime

Production-equivalent Windows CI `34081705591` is success. Exact final review target `744c2b8...` also ran Windows CI `34082031689`, completed successfully with install, lint, typecheck, domain, integration, build, package, packaged regression and artifact upload all green.

## Decision

**ENGINEERING PASS**

No production rework is required before Owner Product Reality retest. A focused Owner retest is required because the previous product-value test was invalidated by the public-only source mismatch. The retest should use one real private repository and judge whether the source is actually worth keeping connected, while confirming the login/privacy disclosure feels acceptable.
