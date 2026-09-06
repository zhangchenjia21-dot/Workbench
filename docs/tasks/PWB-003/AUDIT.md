# PWB-003｜Reliability Audit

Status: AUDIT IN PROGRESS; A-01 demonstrated before fix

起点：`6046f5d39b92172a80970648843b88f9f71c6c36`；Formal Base：`d990ef0f1807a2a0cacd91ba9447ebef5be692b8`。开始时工作区干净。Authority / Read First 已按 TASK 顺序读取并核对 manifest blob；未改变 frozen 文档。

先记录审计问题，执行复现后填写结果；PENDING 不是 finding，也不授权生产修改。

| ID | Path / transition | Expected invariant | Reproduction / test | Observed / Finding / Impact / Fix / Reason / Regression |
|---|---|---|---|---|
| A-01 | series → occurrence → ack → single delete → restart → backup/restore → re-edit | INV-03/04，删除后的确认不得意外重新附着 | 新增可靠性测试：检查 raw ack、三种范围投影及既有 saveException 命令 | PENDING；特别区分正常 GUI 与公开命令可达性 |
| A-02 | move/edit/delete → whole-series reject/confirm/delete | 身份固定、例外只限原键、无关确认保留 | 原 domain 回归 + 确定性状态序列 | PENDING |
| A-03 | item ack/edit/delete；Reminder/Memo/Unscheduled edit/delete | 确认不改事实，删除不留可见来源 | 状态序列 + 原 domain / packaged CRUD | PENDING |
| A-04 | Month/Week/Today after write/restart/restore | INV-02，同一 canonical graph，信息日期精确、Vector 无确认 | 独立期望模型 + packaged 多视图导航 | PENDING |
| A-05 | full graph commit/restart；uncommitted multi-table crash | INV-05，全部提交或全部回滚、integrity ok | 原完整 V0 restart + 新增多实体进程中断 | PENDING |
| A-06 | v1/v2 migration success/failure；staged restore/reopen compensation | schema/version/data 回滚、安全快照有效、坏候选不改 live | 原 7 项 integration + 新增序列恢复 | PENDING |
| A-07 | ≥25 transitions with expected state | 无重复身份、无意外增长、无状态漂移 | 新增确定性重复操作，逐步核对模型/ack/投影 | PENDING |
| A-08 | packaged one-session navigation/state mutations | 详情/选择无失效来源、无重复、无 fatal error | 新增 packaged 重复使用脚本 | PENDING |
| A-09 | repeated close/hide/restore/focus → real Exit | 同一窗口与 tray、进程存活、正常退出 | 新增 6 次 packaged lifecycle 循环 | PENDING |

## Fix authorization

尚无已证实 finding；生产代码未修改。A-01 先复现旧版本，记录影响与失败断言后才决定 FIXED / NO FIX REQUIRED / NOT REPRODUCIBLE。

## A-01｜已复现 finding，生产修复前记录

- Path：公开 `saveSeries → acknowledge → saveException(null) → close/open → backup/restore → saveException(value)`。
- Expected invariant：INV-04 / H-AC-06，删除操作后的不可见确认不能借重新编辑再次生效；TASK §6.2 明确将“valid V0 operations 下重新可达”列为修复依据。
- Reproduction：`npx tsx --test 测试/可靠性测试.ts`，未修改的 packet HEAD 生产代码。
- Observed：`residualAfterDelete=1; reeditAcknowledged=true; publicCommandAccepted=true`；2 个 focused tests 均失败（true !== false）。Today/Month/Week 在 tombstone 仍存在时均正确隐藏；restart/restore 本身没有投影错误。
- Finding：YES。Impact：旧视觉状态穿过删除边界重新附着于重新编辑的同原键。不是附着错误 ID，也不是数据丢失。正常 GUI 无复活按钮；复现使用已暴露、校验通过的公开命令，不声称鼠标路径已出现该缺陷。
- Fix required：YES。仅在保存 tombstone 或编辑既有 tombstone 时，按完整 `occurrence:seriesId@originalKey` 删除该来源所有日期确认；与例外 upsert 同事务。后者兼容旧快照残留。普通未删除编辑保留确认规则。不扫全库、不变 schema、不加恢复功能。
- Regression added：删除/重启/恢复/公开重编辑；无关 series、同 series 其它 occurrence、single item 确认隔离；旧快照历史残留；无效 Track 编辑回滚；普通编辑保留确认。
- Before：2 tests / 0 passed / 2 failed。After：待执行。最终 decision 待 focused/full evidence 确认后标记 FIXED。
