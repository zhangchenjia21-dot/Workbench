# COMPLETION｜PWB-003｜TA-2 Reliability Hardening

Task ID: PWB-003

Result: HARDENED_WITH_FIXES

Status: HARDENED_WITH_FIXES / READY FOR 05 INDEPENDENT REVIEW

Task Branch: `task/PWB-003-ta2-reliability-hardening`

Formal Base SHA: `d990ef0f1807a2a0cacd91ba9447ebef5be692b8`

Task Packet Commit SHA: `6046f5d39b92172a80970648843b88f9f71c6c36`

Implementation SHA: `00a54f587159c9ef18d3444941f0fd67ff3584cf`

Validation code/tests/workflow SHA: `3b5cc29442e224e1f9d33e0cd3683e14684cb386`

Exact final branch HEAD: 本报告与 CI 证据收尾提交的 SHA，提交后由 Builder 最终回复及直接 05 handoff 返回；在最终 checkout 执行 `git rev-parse HEAD` 得到同一精确值。此字段不把父提交伪称为包含本报告的 final HEAD。

## Audit conclusion / findings

先完成 Authority / Read First，再创建 AUDIT 与未改生产代码的复现。Audit-first commit `d4a0144f5b33e8004a19f3cb28f7b5478e450d5b` 与后续生产修复独立。系统审计九类风险面，只发现 A-01 一项可复现问题。完整记录见 [AUDIT.md](AUDIT.md)。

| ID | Reproduction | Impact | Decision | Fix SHA |
|---|---|---|---|---|
| A-01 | ack → 仅删除 occurrence → restart → backup/restore → 既有公开 saveException 重编辑同一 originalKey | 删除时残留 1 行 ack；重新编辑后旧确认再次显示。正常 GUI 无复活入口，未声称鼠标路径可达 | FIXED | `00a54f587159c9ef18d3444941f0fd67ff3584cf` |
| A-02..09 | 身份/例外/信息对象/三视图/重启与九表 crash/迁移恢复/115 次状态操作/6 轮 packaged lifecycle | 受测范围未发现其它问题 | NO FIX REQUIRED | NONE |

Production change：仅 `src/个人状态/L2_流程层/状态维护流程.ts` 增加 13 行。在单次删除或旧 tombstone 重编辑时，以完整 occurrence sourceId 删除所有日期确认，与例外 upsert 同事务；失败共同回滚。普通未删除编辑、原键、series、其它 occurrence/item 确认不变。

未修改 schema version（仍为 v3）、DDL、公开 API、产品 UI、Bootstrap、SQLite 连接/恢复流程或 frozen Authority。没有新增产品能力、清库流程或跨平台抽象。

## Changed files / areas

- Production：上述现有 L2 保存例外事务。
- Tests：新增 `测试/可靠性测试.ts`，由原 `测试/持久化测试.ts` 导入；新增 `scripts/可靠性验证.mjs`，由原 `scripts/打包验证.mjs` 调用。
- CI：原 Windows workflow 改为本 task branch 与 PWB-003 artifact 名称，仍用现有验证栈。
- Docs / evidence：本 Task 的 AUDIT、COMPLETION 与 `证据/`。PWB-001/PWB-002 历史证据未改。

## H-AC matrix（Builder 工程验证，不是阶段验收）

| Gate | Result | Evidence |
|---|---|---|
| H-AC-01 | VERIFIED | AUDIT A-01..09：逐项 transition / invariant / reproduction / observation / finding / impact / fix / regression |
| H-AC-02 | VERIFIED / FIXED | focused-before 2/2 按预期失败；after residual=0 / reedit ack=false；旧备份兼容与隔离断言 |
| H-AC-03 | VERIFIED | 九表未提交 child-process SIGKILL；事务期间只读 graph、重开 graph 与 ack 精确不变；原 committed V0 restart |
| H-AC-04 | VERIFIED | 原 v1/v2 migration success/failure、DDL/version/data rollback、旧 safety 可用、staged restore、坏候选/坏例外拒绝、reopen 补偿及 fatal path |
| H-AC-05 | VERIFIED | daily/weekly 原键、移入、单删、整循环拒绝/确认清除、无关来源隔离；115 次序列 |
| H-AC-06 | VERIFIED | 确认不改 series/exception/Track/Vector；exact sourceId 清理；同循环其它 key、其它循环、item 保留；普通编辑保持语义 |
| H-AC-07 | VERIFIED | 独立日期模型核对月/周/单日范围与 Today；GUI Month/Week/Today 六轮；信息定日、Unscheduled 排除、Vector 只读 |
| H-AC-08 | VERIFIED | 5×23=115 操作；6 轮同会话 36 次 GUI writes；每轮 complete graph/ack 回 baseline；无重复/失效选择；pageErrors/stderr=[] |
| H-AC-09 | VERIFIED | packaged 6 次 close-hide → tray click/double-click handler → focus；count=1 / same ID；进程存活；随后 real Exit=0、restart |
| H-AC-10 | VERIFIED | 原 domain 10/10、原 integration 7/7（新增后 11/11）；原 packaged TA-1A/UAT-C1/V0 路径全部通过 |
| H-AC-11 | VERIFIED | 生产仅 13 行 L2 root fix；依赖检查 PASS；无新增 scope、frozen 修改或历史证据重写 |
| H-AC-12 | VERIFIED | 本报告与 AUDIT 明确 API-only 重编辑可达性、旧残留策略、bounded checks、恢复补偿和 05/Owner 边界 |

## Focused / full validation

运行环境：Windows win32，host Node v24.11.0；真实 packaged Electron 40.0.0 / embedded Node 24.11.1 / SQLite 3.50.4。测试数据均隔离，未操作 Owner personal DB。

| Command | Exact observed result | Log |
|---|---|---|
| `npx tsx --test --test-name-pattern='A-01' 测试/可靠性测试.ts`（修复前） | 2 tests / 0 pass / 2 fail；复现预期缺陷 | `证据/focused-before.log` |
| `npx tsx --test 测试/可靠性测试.ts`（修复后） | 4 tests / 4 pass / 0 fail；115 transitions；integrity ok | `证据/focused-after.log` |
| `npm ci --no-audit --no-fund` | exit 0 | `证据/ci---no-audit---no-fund.log` |
| `npm run lint` | exit 0；Architecture dependencies PASS | `证据/run-lint.log` |
| `npm run typecheck` | exit 0 | `证据/run-typecheck.log` |
| `npm test` | 10 tests / 10 pass / 0 fail | `证据/test.log` |
| `npm run test:integration` | 11 tests / 11 pass / 0 fail | `证据/run-test_integration.log` |
| `npm run build` | exit 0 | `证据/run-build.log` |
| `npm run package:win` | exit 0；Windows x64 dir | `证据/run-package_win.log` |
| `npm run test:packaged` | exit 0；PASS，既有路径 + 六轮 hardening | `证据/run-test_packaged.log`、`证据/packaged.json` |
| `git diff --check` / staged scope review | 已通过；最终文档提交前重核 | Git final closeout |

新增测试开发中先校准了公开 exception snapshot 的 `value`/tombstone 形状与 TypeScript narrowing。第一次 packaged 新 Week locator 因标题与时间同节点超时（`证据/packaged-test-locator-failure.log`）；修正测试匹配后完整重跑成功。这些是测试代码问题，不计为生产 findings。

本机全流程在 implementation SHA 上完成，验证脚本随后归入 `3b5cc29442e224e1f9d33e0cd3683e14684cb386`；下列 CI 对提交后的同套生产/测试/工作流从干净 checkout 重建验证。

## Windows packaged / CI evidence

本机 `证据/packaged.json`：isPackaged=true、file URL、独立 userData、真实 tray 存活。截图包括 `hardening-plan.png`、`hardening-today.png` 及重跑的原 UAT/V0 截图，均在本轮证据目录。

- EXE SHA-256：`5b79a0b697100e336a0f5c2b767bd8f5d25f86e0a4fd7f644ed3136ec3f13205`
- app.asar SHA-256：`a525686fe1b35af77840c31af5bd7b8d08455e2f270a682443e1d0e82b384f74`
- Windows CI：[run 34034047262](https://github.com/zhangchenjia21-dot/Workbench/actions/runs/34034047262)，head `3b5cc29442e224e1f9d33e0cd3683e14684cb386`：SUCCESS（全部步骤成功）。

CI 证据：`证据/windows-ci.json` 保存 run/job/全部 step 状态、artifact 和 job log 输出的 packaged JSON。Job `101488752973`；artifact `9989595388`（143233056 bytes；digest `sha256:e54a947e0f9f1a5c7891c4048019c27f8f5687fd8784b1dbd140aed05e102795`）。CI EXE/app.asar 与本机上列指纹完全一致；packaged 六轮、36 GUI writes、same-window/graph/ack、无 pageErrors/stderr 的断言全部通过。

最终收尾只包含 AUDIT/COMPLETION/CI evidence；生产、tests、workflow 与该 CI SHA 完全相同。最终 Push 后另核最终 HEAD 的 Actions 结果并随 05 handoff 返回，不在文档中循环嵌入自身 commit hash。

## Known limitations / recovery

1. A-01 的重现影响在现有公开命令边界；GUI 没有复活 deleted occurrence 的入口。没有新增此入口。正常 GUI ack → single delete 的数据库清理已在 packaged 六轮验证。
2. 未做启动/restore 全库扫除。旧备份中未触及的 tombstone 确认仍被投影忽略；删除或重新编辑该 key 时清理。整循环编辑/删除继续清理该 series。普通移动回同日期的同身份确认保持现有语义，仍是视觉状态。
3. 115 次序列、6 轮连续 GUI 为 bounded reliability evidence，未声称数天 soak、内存基准或硬件断电结果。无新增 telemetry。
4. Native 文件选择与恢复确认沿用既有测试 stub；tray 是真实对象的 click/double-click 事件注入，调用真实处理函数，未声称物理点击系统通知区。
5. 恢复失败仍使用 safety snapshot 补偿；补偿也失败时发出致命错误并退出，保留 safety 目录。Owner 应保留该目录并交 05 排查；本轮未削弱恢复守卫。无 schema migration，因此不需新增 downgrade；旧安全备份仍按原恢复契约验证与恢复。

Scope deviations: NONE。

Unexpected production findings: 仅已记录 A-01；其它未证实猜测未扩展为修复。

Recommended next action: 05 INDEPENDENT REVIEW。

生产行为有范围极小的变化，由 05 决定是否及如何进行 focused Owner retest。05 PASS（及必要 retest）后回 00 决定 TA-2 Stage Exit / 是否授权 TA-3；不回 04。

不 merge main，不宣布 TA-2 PASS、TA-3 readiness 或 V0 Product PASS。
