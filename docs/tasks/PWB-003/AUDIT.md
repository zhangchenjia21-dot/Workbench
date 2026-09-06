# PWB-003｜Reliability Audit

Status: AUDIT COMPLETE / ONE DEMONSTRATED FINDING FIXED; CI PENDING

起点：`6046f5d39b92172a80970648843b88f9f71c6c36`；Formal Base：`d990ef0f1807a2a0cacd91ba9447ebef5be692b8`。开始时工作区干净。Authority / Read First 已按 TASK 顺序读取并核对 manifest blob；未改变 frozen 文档。

先记录审计问题，执行复现后填写结果；PENDING 不是 finding，也不授权生产修改。

| ID | Path / State Transition | Expected invariant | Reproduction / test | Observed result | Finding | Impact | Fix required / Reason | Regression added |
|---|---|---|---|---|---|---|---|---|
| A-01 | series → occurrence → ack → single delete → restart → backup/restore → public re-edit | INV-03/04；删除边界不能恢复旧确认 | `可靠性测试.ts` 前两项；before/after log | 基线 residual=1 / reedit ack=true；修复后 0 / false；tombstone 存在时三视图均隐藏 | YES | 公开命令重编辑时旧视觉状态重新可达；GUI 无复活入口 | YES / FIXED；13 行事务内 occurrence 精确清理 | 删除跨重启/恢复；旧快照；无关来源隔离；失败回滚；普通编辑保留确认 |
| A-02 | single move/edit/delete；whole edit reject/confirm/delete with exceptions | 原键固定、整循环确认清除策略、无关来源不变 | 原 domain 的循环身份及无效规则测试；新增 115 次序列 | 原键始终 `seriesId@originalKey`；拒绝不写入；确认后例外与该循环 ack 清除 | NO（除 A-01） | 未观察到身份漂移或串删 | NO / 既有规则一致 | 每轮 daily/weekly、move、ack 两日期、delete、whole reject/confirm、其它来源保留 |
| A-03 | single item ack/edit/delete；Reminder/Memo/Unscheduled edit/delete/restore | 信息无确认；按日期投影；删除不留下可见来源 | 原 domain 信息生命周期；原 packaged V0 CRUD；新序列 | items 按源 ID 清除全部日期确认；三信息类型无 ack 写入入口；恢复 graph 相等 | NO | 未观察到孤立关联或信息泄漏到 Today | NO / 既有 narrow ack 保持 | 单次移动后新日期未确认、delete 清理；信息定日隔离、删除后恢复 |
| A-04 | Month/Week/Today after mutations/restart/restore | INV-02/06；同一 canonical facts；Vector 只读 | 新序列独立 oracle；原 date/DST tests；packaged 六轮（三视图） | 单日/月范围/周范围均与明确日期的期望实例相等；GUI 结果见 packaged evidence | NO（已执行自动测试范围内） | 无第二事实源或重复实例 | NO / 所有日历经 L3 pure projection；Today 经同一展开器 | 五轮逐阶段身份/标题/日期核对；定日信息、Unscheduled exclusion、Vector 事实不变 |
| A-05 | full graph committed restart；九表 uncommitted crash | 提交存活、未提交不可见、完整性有效 | 原 full-V0 graph test；新九表 crash test | 独立读取在事务活跃时仍为旧 graph；kill 后九表/ack 全部回滚；integrity/foreign keys 有效 | NO | 未观察到部分提交/部分投影 | NO / SQLite 事务保证在受测故障下成立 | Track/item/vector/series/exception/reminder/memo/unscheduled/ack 同事务中断 |
| A-06 | v1/v2 ordered migration + failure；full-V0 restore；reopen compensation | INV-05；版本/DDL/data 原子、安全快照、候选不改 live | 既有 7 项 integration；新每轮 independent backup/restart/restore | 11/11 integration 通过（7 原有 + 4 新增）；旧版快照独立有效；坏候选/坏例外拒绝；补偿路径符合契约 | NO | 未观察到半升级或坏候选覆盖 live | NO / 恢复守卫保持 | 新序列完整图与 raw ack 对比；A-01 旧备份残留兼容 |
| A-07 | bounded repeated state transitions | ≥25；独立期望而非仅无异常 | `A-02..07 五轮独立期望模型` | 5 轮 × 23 = 115 操作；每轮回到 baseline graph + zero ack；无重复 ID、integrity ok | NO（A-01 已修） | 未观察到状态漂移/意外行增长 | NO / 不扩大为性能项目 | 明确两日期发生模型；每个关键阶段核对三范围/Today/ack；每轮 restart/backup/restore |
| A-08 | one packaged session navigation/state operations | 无 stale selection/detail、重复/错误/状态漂移 | `scripts/可靠性验证.mjs` | 6/6 轮通过；36 次 GUI 写入；每轮 graph/ack 精确回 baseline；pageErrors/stderr=[] | NO | 无状态漂移或失效选择 | NO / 受测会话稳定 | 6 轮 36 GUI writes，正常表单与选择删除；每轮完整快照/raw ack 回 baseline；pageerror/stderr 检查 |
| A-09 | repeated close-hide → restore-focus → real Exit | 同一 logical window、tray 存活、真实退出 | 新 6 轮 lifecycle + 原 quit/restart | 6/6 次通过；same window id=1、count=1、focused=true；真实 Exit=0 后 restart 完整 graph 相等 | NO | 无窗口积累或退出失败 | NO / 既有生命周期稳定 | count=1、same ID、hidden/process alive、click/double-click handler、focus、Exit=0 |

## Audit method / boundaries

只读代码检查覆盖 L0 日期/原键校验、L1 展开/数据库结构/连接/恢复、L2 事务、L3 公开接口、UI refresh 与详情 selection、Bootstrap single-instance/tray。依赖检查确认 L3 → L2 → L1 → L0；UI 跨模块只经公开 L3。生产仅改已有 L2，未新增目录层/公开 API/DDL。

Month/Week 来自同一 snapshot 与 `expandOccurrences`；Today 来源同一 canonical Store。新 oracle 显式列出两日期的预期实例，不调用生产展开器生成预期。UI `chosen` 只保留当天仍存在的 item；删除后按钮归零在 packaged 脚本验证。原测试另覆盖跨日选中移动。

恢复链：只读校验候选 → live safety snapshot → candidate staging snapshot → 有序 migration/validation → 关闭 canonical → 同卷 replace/reopen；reopen 失败补偿 safety；补偿也失败抛 AggregateError，由宿主退出并保留 safety。没有修改该链。

## A-01｜已复现 finding，生产修复前记录

- Path：公开 `saveSeries → acknowledge → saveException(null) → close/open → backup/restore → saveException(value)`。
- Expected invariant：INV-04 / H-AC-06，删除操作后的不可见确认不能借重新编辑再次生效；TASK §6.2 明确将“valid V0 operations 下重新可达”列为修复依据。
- Reproduction：`npx tsx --test 测试/可靠性测试.ts`，未修改的 packet HEAD 生产代码。
- Observed：`residualAfterDelete=1; reeditAcknowledged=true; publicCommandAccepted=true`；2 个 focused tests 均失败（true !== false）。Today/Month/Week 在 tombstone 仍存在时均正确隐藏；restart/restore 本身没有投影错误。
- Finding：YES。Impact：旧视觉状态穿过删除边界重新附着于重新编辑的同原键。不是附着错误 ID，也不是数据丢失。正常 GUI 无复活按钮；复现使用已暴露、校验通过的公开命令，不声称鼠标路径已出现该缺陷。
- Fix required：YES。仅在保存 tombstone 或编辑既有 tombstone 时，按完整 `occurrence:seriesId@originalKey` 删除该来源所有日期确认；与例外 upsert 同事务。后者兼容旧快照残留。普通未删除编辑保留确认规则。不扫全库、不变 schema、不加恢复功能。
- Regression added：删除/重启/恢复/公开重编辑；无关 series、同 series 其它 occurrence、single item 确认隔离；旧快照历史残留；无效 Track 编辑回滚；普通编辑保留确认。
- Before：2 tests / 0 passed / 2 failed。After：focused 4/4 passed，删除后 residual=0、重编辑 acknowledged=false；115 次序列及九表 crash 通过。Decision：FIXED（完整 regression 与 packaged 已通过，CI 待执行）。

## Evidence / limitations

- Audit-first commit：`d4a0144f5b33e8004a19f3cb28f7b5478e450d5b`，含修改前 2 个失败断言；production fix：`00a54f587159c9ef18d3444941f0fd67ff3584cf`，仅 L2 新增 13 行。
- `证据/focused-before.log`、`focused-after.log`、`test.log`、`run-test_integration.log`、`packaged.json` 与各 validation log 可重放。日志只统一 UTF-8/去掉行末空白；未删失败结果。
- 首次新 packaged 脚本 Week exact-text locator 超时；截图显示标题与时间在同节点。改为包含标题匹配后完整重跑通过。保留 `packaged-test-locator-failure.log`，这是测试定位器修正，不是第二个生产 finding。
- 历史快照中的 tombstone ack 不在启动/restore 时全库扫描；继续删除或公开重新编辑该 key 时精确清理。未触及的 tombstone 仍不可见，整循环编辑/删除继续清理该 series。普通移动/编辑的同 ID+date 确认规则不变；这是视觉状态而非 completion history。
- packaged 使用真实 Windows EXE、Playwright GUI 和真实 Tray 对象事件处理函数；原生文件选择/确认对话框沿用既有 stub。托盘 click/double-click 为事件注入，不声称物理鼠标点系统通知区。所有测试数据隔离在临时目录。
- 115 次状态序列与 6 轮 GUI 为有限重复使用证据；未做长时间性能/内存基准或断电测试。九表 crash 为测试子进程 SIGKILL，不等同硬件掉电证明。
- 仅 A-01 为 YES；其它受测风险面无新增 finding。不得由工程验证推导 TA-2 PASS、TA-3 readiness 或 Product PASS。
