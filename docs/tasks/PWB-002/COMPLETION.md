# PWB-002｜TA-1B Complete V0 Completion

Status: **IMPLEMENTED / READY FOR 05 INDEPENDENT REVIEW**

- Task ID: PWB-002
- Result: IMPLEMENTED
- Task Branch: `task/PWB-002-ta1b-complete-v0`
- Formal Base: `50bebd2b07619e4e06852ad8a20c110be0553315`
- Task Packet Commit: `61d817aa08b33cf8ea1f483d89fd336943078c00`
- Production Implementation SHA: `066d6601df013173b1aca85b215b87d40453a318`
- Exact Final Branch HEAD: 在本报告与证据 commit + push 后由 Builder 聊天回包给出，避免报告自引用。
- Recommended Next Action: **05 INDEPENDENT REVIEW**，不回 04 中转。

## Outcome / Changed Areas

补齐 frozen TA-1B：daily / weekly recurrence、显式单次例外、Reminder、Memo、Unscheduled、Week View，以及同日 Today projection 与窄 occurrence acknowledgement。Month / Week / day-detail / Today 共用同一 Plan 数据与展开算法。没有回退 TA-1A UAT-C1 交互。

- `个人状态/L0_公理层`：循环/信息 DTO、calendar-date 运算、原 occurrence key 校验。
- `个人状态/L1_器件层`：纯日期范围展开器、schema v3 与完整图校验；原数据库连接、snapshot、restore、migration runner 保持原流程。
- `个人状态/L2_流程层`：循环/例外/三类信息事务维护、Today 当天派生、occurrence 确认。
- `个人状态/L3_外交层`：明确维护命令；新增 renderer 可用的纯只读日历投影接口，避免把 SQLite 生命周期加载到浏览器。
- `桌面界面/L3_外交层`：循环编辑/范围/警告对话框，三个信息入口，月/周切换，扩展当天详情与 Today。
- `Bootstrap`：只增加明确 IPC 白名单，保留既有 Electron / tray 宿主。
- 工程外围：复用 node:test、Playwright packaged 流程；Windows CI 改为本 Task Branch；更新 README 与[状态/失败矩阵](状态与失败矩阵.md)。

没有新增依赖，package-lock 未变。原 PWB-001 文档、测试断言和历史证据保持；已有测试只在尾部追加覆盖。没有修改 frozen Product / Route / Architecture。

## Authority / Start Evidence

完整读取 TASK 后，按 Read First 核对冻结 Route / Architecture / Product、D-005、已接受 UAT-C1 合同和当前源码。干净工作树切换至用户指定 Task Packet HEAD，其唯一父提交正是 Formal Base。

实时获取 `Vibe-Coding/origin/main`，以下 blob 与 Task manifest 精确一致：

- Product: `b4ef90d8b8b1d627a9cf6d7b4cf706a6e034f167`
- Route: `4e55cddefb185c65e16da1519cd3d251c2f030fe`
- Architecture: `83c4ef37e95d80df3713095368e560a0c3bbe77b`
- D-005: `084e424396439e3e1ca5e30f2ee565f61286fb08`
- 项目状态: `65a909dd50f66ba3a157c671e7c5c02fcd2b877e`

## Schema / Migration / Recovery

Schema 从 TA-1A v2 按序升级至 v3，只追加 `series / exceptions / reminders / memos / unscheduled` 五张事实表。原 v1/v2 DDL、Track/Item/Vector ID、关系与 acknowledgement 数据不重建。Series 的 weekdays 是有限 ISO 星期数组的 JSON 字段；只允许 daily 空数组或 weekly 非空、不重复的 1..7。

Exception 以 `(seriesId, originalKey)` 为主键；series 外键级联删除，Track Link 外键检查。删除例外保存 tombstone，编辑例外保存展示字段。数据库候选验证继续检查 application ID、精确预期结构、integrity、FK 与领域值；v3 进一步验证 series 规则和 exception 原键。

升级沿用：pre-upgrade snapshot → 单事务有序 DDL/data/version → 完整验证 → commit。失败关闭连接并抛错。v2 fixture 注入 migration 失败后，name / schema / version 全部恢复，且 safety 中仍有 v2 快照。成功升级保留稳定关联、Vector 和日程确认。

完整 V0 backup fixture 包含 Track、单次日程、Vector、series、移动与删除例外、Reminder、Memo、Unscheduled、移动 occurrence 确认。独立打开 snapshot、恢复前 safety、staging 验证、恢复后 restart 都与原图 deepEqual。旧 v2 backup 可在 staging 中升级。无效文件、伪 Workbench 结构和无效 exception key 拒绝后 live state 不变；既有 reopen 失败补偿、补偿失败致命错误测试继续通过。

## Recurrence / Identity / Date Model

- Occurrence ID 为 `Series ID@YYYY-MM-DDTHH:mm`，后半段是**原定本地日期和开始时间**。移动后的展示日期/时间只写 exception，身份不变。
- 每日/每周每个符合规则的日期最多一个 occurrence；start/end 均包含，end 可空。未来 occurrence 只在请求日期范围内生成，不写库。
- 范围外原位置移入当前日期的 exception 会单独纳入，原位置不会重复出现。Month / Week 调用同一纯展开入口；Today 在主进程调用同一展开器。
- occurrence 编辑/删除只能选“仅这一次 / 整个循环”；当天多选与右键清空只处理 single Items。循环定义折叠入口支持维护已结束或暂无展示 occurrence 的 series。
- 整循环存在例外时，UI 显示明确警告并要求勾选确认；主进程也拒绝未确认的更新。取消不发送写入。确认时 series 更新、旧例外清除同事务提交，不 remap。
- 整循环更新清理该 series 的旧窄确认记录，避免旧规则确认污染新规则；整循环删除同时移除 series / exceptions / 其确认记录，不影响其它来源。
- Today occurrence 确认按 `LocalDisplayDate + occurrence:OccurrenceID` 写入，Plan/Track/series/exception 不变；Vector、Reminder、Memo 都拒绝确认。

日期保留 `YYYY-MM-DD`，时间保留 `HH:mm`。Gregorian 日期递增与 weekday 为纯日历算术，不编码 UTC 午夜。DST 测试在独立进程设置 `America/New_York` / `Asia/Shanghai`：2026-03-07→03-09 offset 从 300→240 分钟，但四天 occurrence 均保持 `09:00`；同一 instant `2026-03-08T04:30:00Z` 的本地日分别为 03-07 与 03-08。另覆盖闰日、跨年、weekly 多星期、范围端点与移动原身份。

## Acceptance Matrix

以下 PASS 仅为 Builder 工程验证，不是 Owner UAT / TA-1B / Complete V0 Product PASS。

| Gate | Result | Evidence |
|---|---|---|
| AC-01 TA-1A regression | PASS | 原 5 domain + 5 integration + packaged 6 组路径及 UAT-C1 4 组路径全部保留通过；[UAT 月历](证据/uat-month.png)、[详情](证据/uat-day-detail.png)、[右键](证据/uat-context-menu.png)、[Vector](证据/uat-today-vector.png) |
| AC-02 Series UI/projection | PASS | packaged 正常创建 daily、weekly 周一/周三，指定起止/时间/Track；9 个日期逐个核对日详情内外范围与星期；[Month](证据/v0-month.png)、[Week](证据/v0-week.png) |
| AC-03 Dynamic expansion | PASS | 仅定义与显式例外表，纯范围展开；不存在 future occurrence canonical 表或第二 store |
| AC-04 Stable identity | PASS | GUI 将明日 09:00 移至今日 15:00，ID 仍为原日期键；随后 Week 再次编辑仍寻址同一 exception |
| AC-05 Single exception | PASS | 单次编辑、删除不改 series、不改其它日期；移入/原位置抑制和删除 tombstone 均验证 |
| AC-06 Whole series | PASS | 普通 GUI 整循环删除不影响另一循环/单次日程；domain 验证级联例外清理，无第三范围 API |
| AC-07 Existing exceptions policy | PASS | GUI warning/cancel deepEqual；confirm clears；domain 验证更新新规则、无 remap、失败原子性；[警告](证据/v0-exception-warning.png) |
| AC-08 Reminder | PASS | GUI create/edit/delete/cancel；date-only/可选 time；Today 当天包含、未来排除、无确认 |
| AC-09 Memo | PASS | GUI create/edit/delete/cancel；按展示日过滤，信息 DTO 无 acknowledged |
| AC-10 Unscheduled | PASS | 独立 Plan CRUD 与 Track Link；永不进入 Today，无 hierarchy/priority/kanban |
| AC-11 Week consistency | PASS | GUI 月↔周、前后周、时间显示、Week 内编辑后 Month/Today 同步；无另一 schedule store |
| AC-12 Today full V0 | PASS | 当前 Vector/单次/例外后 occurrence/当日 Reminder/Memo；future/Unscheduled 排除；[Today](证据/v0-today.png) |
| AC-13 Occurrence ack | PASS | GUI 确认移动 occurrence，原 key 与 display date 组合；series/exception/Track deepEqual；完整图 restart 保留 |
| AC-14 Date/DST | PASS | 两时区子进程、真实 offset 变化、09:00 wall-time、local date 边界、weekly/闰年/inclusive 等自动断言 |
| AC-15 Migration | PASS | 真正原生产 v2 DDL/data fixture → v3；预升级 snapshot、注入启动失败 DDL/data/version rollback、success 保留 ID/关联/ack |
| AC-16 Complete recovery | PASS | full V0 snapshot 独立校验、UI 变更后恢复、restart deepEqual；旧 v2 staging 升级；无效候选拒绝 |
| AC-17 Direct usability | PASS | 所有新增业务写入均经 packaged 普通 GUI；`view()` 仅观察，不用 DB/CLI 构造唯一用户路径；[信息维护](证据/v0-plan-information.png) |
| AC-18 Packaged host | PASS | Windows x64 Electron，无 dev server；close-hide/shared tray event restore-focus/real Exit；完整 V0 UI/restart；原宿主未替换 |
| AC-19 Scope integrity | PASS | 精确 diff 限 frozen TA-1B；架构检查无向上依赖/跨模块内部调用；原证据/frozen 源未修改，无 Future 平台能力 |

## Exact Validation

本机 Windows 10.0.26200，Node 24.11.0；packaged Electron 40.0.0 / Node 24.11.1 / SQLite 3.50.4。

| Command | Result |
|---|---|
| `npm ci --no-audit --no-fund` | exit 0，560 packages；lockfile unchanged |
| `npm run lint` | exit 0，ESLint + Architecture dependencies PASS |
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0，10 tests / 10 pass / 0 fail |
| `npm run test:integration` | exit 0，7 tests / 7 pass / 0 fail |
| `npm run build` | exit 0 |
| `npm run package:win` | exit 0，真实 Windows x64 packaged app |
| `npm run test:packaged` | exit 0，原 10 组及新增 4 组 Complete V0 路径；implementation SHA 提交后再次复核 |
| `git diff --check` / cached check | exit 0 |

[validation.json](证据/validation.json)、各命令日志与[packaged.json](证据/packaged.json) 保存在本 Task 独立证据目录。测试扩展加入原 `领域测试.ts`、`持久化测试.ts`；`完整V0验证.mjs` 由原 packaged runner 调用，没有第二测试栈。

首次 DST 子进程测试遇到 CJS/ESM 导出加载不匹配，改用本项目 tsx/cjs 后通过；未变更日期断言。首次静态检查发现局部变量 const 提示，修正后通过。没有隐藏失败或跳过测试。

## Windows Packaged / CI

Owner 可继续双击根目录 `启动 Workbench.cmd`，产物为 `out/win-unpacked/Workbench.exe`。

- EXE SHA-256: `634ac98644573b5cb36022206422a360b2c34de686a04a1bce482248c0e88d17`
- app.asar SHA-256: `6b1f182118f9b06f01a6b3bf14f6fcf39a11987462d6b1b4ad8bfa55b8acb74e`
- local packaged evidence HEAD: `066d6601df013173b1aca85b215b87d40453a318`

Windows CI [run 34030486124](https://github.com/zhangchenjia21-dot/Workbench/actions/runs/34030486124) 在 production implementation SHA `066d6601df013173b1aca85b215b87d40453a318` 上 **completed / success**。windows-latest 全部步骤成功；日志确认 domain 10/10、integration 7/7 与完整 packaged 14 组检查。CI 的 EXE / app.asar 指纹与上述本机产物相同。

[Artifact 9988446297](https://github.com/zhangchenjia21-dot/Workbench/actions/runs/34030486124/artifacts/9988446297)：`PWB-002-windows-066d6601df013173b1aca85b215b87d40453a318`，143071872 bytes；ZIP SHA-256 `b8cd40a888a8cf89fafa5b9696a9c1da8693abd6ee3e4dde0614b381378e55d2`；expires 2026-09-20T11:32:43Z。结构化 run/job/artifact 与 packaged 日志摘录见 [windows-ci.json](证据/windows-ci.json)。Completion 后续提交仅增加报告及证据，不改变已验证 production。

## Limitations / Scope / Expanded Read

- Scope deviations: 无；用户的 TA-1A/UAT-C1 保护要求全部纳入 regression。
- 本轮工程验证使用临时目录与虚构数据，没有改写真实 Owner DB。迁移 fixture 代表原生产 v2 schema/data；真实个人数据升级后的产品体验仍属后续 Owner UAT。
- 只显示本地日历时间，不建设时区选择器、绝对 instant 排程、DST gap/fold 闹钟投递策略或 Reminder 通知平台。
- 当前 UI 的日程时间范围沿用同一天 start < end；Week 是按日列出的周视图，不增加 Day View 或拖拽排程。
- 当天多选/清空明确只处理单次日程；循环 occurrence 单独选范围，避免隐式批量作用于 series。
- 原生 backup 文件选择器/restore 确认返回值沿用已有测试替代；循环范围、例外警告、信息删除均执行实际 GUI 控件，未 stub。
- Tray evidence 是真实 Tray 对象及生产共享事件处理函数的程序触发；没有把它写成 Owner 本轮实际鼠标 UAT。Owner Complete V0 UAT 尚未执行。
- 仍为未签名目录分发；无 installer/updater/startup-at-login。
- Expanded read 仅冻结来源、现有实现/验证与四层架构/中文命名/语义注释技能，未扩展至 Future 产品设计。

## Direct 05 Handoff

请 05 在 exact final branch HEAD 上独立检查 Formal Base→Production Implementation→Final 报告差异、AC-01..19、冻结源与 runtime 证据。Builder matrix 不是独立证明。

不 merge main，不宣布 TA-1B PASS / Complete V0 Product PASS / TA-2 readiness。
