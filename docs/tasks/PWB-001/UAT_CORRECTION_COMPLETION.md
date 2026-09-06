# PWB-001｜TA-1A Owner UAT Correction Completion

Status: **READY FOR 05 INDEPENDENT RE-REVIEW**

- Task: `PWB-001`，Revision `UAT-C1`
- Branch: `task/PWB-001-ta1a-first-usable-core`
- Correction Base after Addendum: `b3c286ef244cf52c5603a6cbfb99432da50071af`
- Correction Implementation SHA: `629bf1ce9515590ac21f6a6c2d13913df1c0825d`
- Exact Final Branch HEAD: 由 Builder 在本报告 commit + push 后的聊天回包中给出，避免文档自引用。
- 原 Formal Base: `87d1aba19ab67ea8e87c592447d9f982eca79c04`
- Authority: 原 TASK + UAT_CORRECTION_ADDENDUM + 本轮 Owner 追加“Plan 不常驻显示某日列表”。

## Result / Changed Areas

本轮只完成 UAT-AC-01..06。Plan 月历格以日程标题为主要内容；左键日期格打开独立当天详情，支持查看、创建、编辑、单条删除与同日多选删除；右键提供新建、编辑、清空日程，清空须确认。Plan 主页面已移除常驻某日列表，且没有添加任何 TA-1B 区域或占位。

Today Vector 现在是独立只读信息区域，无确认/完成控件，也无直接编辑入口。DTO 在类型上区分只读 Vector 与可确认日程，主进程拒绝 Vector acknowledgement。Vector 仍从 Plan 事实派生。

修改位置：

- 个人状态 L0/L2/L3：窄 Today DTO、同日原子删除流程与公开边界。
- 桌面界面 L3：当天详情/右键菜单、月历、只读 Vector 与局部样式。
- Bootstrap：delete-items IPC 白名单及 preload，原托盘逻辑未改。
- 测试/脚本：扩展已有 node:test 与 packaged Playwright 回归，无第二验证栈。
- README：同步普通使用路径。

没有修改 SQLite DDL/schema version、migration/backup/restore 实现、Tracks 表单、Windows 启动脚本或 frozen Product/Architecture/Route。原 Task、Addendum、COMPLETION 与历史证据均保持原样。

## Authority / Starting State

工作树干净，从 `65d8e73` fast-forward 至用户指定 Addendum SHA；未合并 main。

实时核对 Vibe-Coding blob：

- D-004: `db15c394d965744d43ebced35ed0c830e5cf9f16`
- 项目状态: `5704f8923d75689abecbd225feebbd33b88a9a1e`
- Product / Route / Architecture 与原 TASK manifest 的冻结 blob 一致。

D-004 明确这是原 TA-1A 可用性纠偏，而非重开架构或进入 TA-1B。原 Vector 可确认测试按 Addendum 收紧为“Vector 不允许确认”；日程确认的隔离、重启与恢复断言继续保留。

## UAT Acceptance Matrix

下列 PASS 为 Builder 工程证据，不是 Owner UAT PASS 或 TA-1A Stage Exit。

| Gate | Result | Evidence |
|---|---|---|
| UAT-AC-01 | PASS | 同日 3 条带时间日程，月历 span 精确匹配标题且无 HH:mm；时间完整保留于详情/编辑；[月历截图](纠偏证据/uat-month.png) |
| UAT-AC-02 | PASS | packaged 左键打开精确日期详情，经正常表单 create/edit/single delete；详情不含其他日期；主动编辑日期后移出该详情；Plan 主页面无“某日的日程”常驻区；[详情截图](纠偏证据/uat-day-detail.png) |
| UAT-AC-03 | PASS | 右键精确三菜单项；多日程编辑打开完整详情，未打开/猜选任一编辑表单；清空取消前后 StateView deepEqual；确认后只清空该日，其他日期与 Vector/Track 不变；右键新建使用点击日期；[右键截图](纠偏证据/uat-context-menu.png) |
| UAT-AC-04 | PASS | 选择同日两条并删除，第三条与其他日期条目保留；领域测试拒绝混入跨日/失效 ID，整批状态不变；编辑改日后的旧选择不再计入当前详情 |
| UAT-AC-05 | PASS | 专用 section/heading、独立底色与标题层级；该区域无 button/input/checkbox，无完成文案；DTO 不含 acknowledged，state 层拒绝确认；只读取 Plan Vector；[Today 截图](纠偏证据/uat-today-vector.png) |
| UAT-AC-06 | PASS | 原 packaged tray close-hide/shared restore/focus/real Exit；重启、ack、备份恢复、Vector overlap、Track linkage、真实未提交 crash/rollback 全部回归通过 |

## Data / Failure Boundaries

- `deleteItems(date, ids)`：日期强制 calendar-date 校验；ids 为指定 ID 数组，null 为清空该日期。所有选择必须属于该日，否则在一笔事务内整批拒绝；不会删除其它日期、Track 或 Vector。
- 删除日程时同事务清理其 source ID 的窄确认记录；保留其它来源确认。
- UI 清空必须显式确认，取消不发送删除命令；单条/多选删除也提供确认。
- 旧库可能留有旧版 Vector 确认行：保持 schema/文件兼容，不迁移或删库；这些行不再影响 Vector DTO/UI，也不能通过 API 新增。旧库、backup/restore、重启场景已有测试。
- 不增加跨日期批量管理器、外部 API、未来数据库列或扩展框架。

## Exact Validation Results

本机 Windows 10.0.26200，Node 24.11.0；packaged Electron 40.0.0 / Node 24.11.1 / SQLite 3.50.4。

| Command | Result |
|---|---|
| `npm ci --no-audit --no-fund` | exit 0，560 packages，锁文件未变 |
| `npm run lint` | exit 0，ESLint + Architecture dependencies PASS |
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0，5 tests / 5 pass / 0 fail |
| `npm run test:integration` | exit 0，5 tests / 5 pass / 0 fail |
| `npm run build` | exit 0 |
| `npm run package:win` | exit 0，真实 Windows x64 packaged exe |
| `npm run test:packaged` | exit 0，原 6 组路径 + 新 4 组 UAT 路径；已在 correction implementation SHA 上复核 |
| `git diff --check` / cached check | exit 0 |

[逐命令退出码](纠偏证据/validation.json)、日志、[packaged.json](纠偏证据/packaged.json) 均单独存放在本轮纠偏证据目录，未覆盖历史证据。

Focused 断言位于 `测试/领域测试.ts`、`测试/持久化测试.ts` 和 `scripts/日程纠偏验证.mjs`。后者由原 `scripts/打包验证.mjs` 调用；测试数据创建、编辑、删除通过普通 UI，读取 state 只用于非空/隔离断言。

首轮 packaged 验证在读取旧的全局 `.eyebrow` 定位时发现多匹配（新增 Vector 层级也有 eyebrow）；修正为 header 范围后通过，没有绕过业务断言。

## Packaged Windows Evidence

本地可直接双击根目录 `启动 Workbench.cmd`；对应产物为 `out/win-unpacked/Workbench.exe`。

- Workbench.exe SHA-256: `ec3b5e8d84c5baebd20795ecc09f60f4fd2d822386b7a898a8b6bf8f513c6dd9`
- resources/app.asar SHA-256: `5ee97f7803005597fc98e39eadab8fc57b051080f32091b1416d84b0bef287b7`

Windows CI [run 34027885631](https://github.com/zhangchenjia21-dot/Workbench/actions/runs/34027885631) 在 implementation SHA `629bf1ce9515590ac21f6a6c2d13913df1c0825d` 上 completed / success；windows-latest 全部步骤成功，包含原回归和四组 focused packaged UAT。CI 日志中的 exe / app.asar 指纹与上述本机产物完全一致。

[Artifact 9987655591](https://github.com/zhangchenjia21-dot/Workbench/actions/runs/34027885631/artifacts/9987655591)：`PWB-001-windows-629bf1ce9515590ac21f6a6c2d13913df1c0825d`，142558837 bytes，ZIP SHA-256 `e87fc0bad9c397c9451e68cd6361fc14c4ff7a6a1c006cda04c2e711770d2f0f`，expires 2026-09-20T10:37:31Z。结构化 run / job / artifact / packaged 日志摘录见 [windows-ci.json](纠偏证据/windows-ci.json)。Completion 提交只增加报告和证据，不改变已验证实现。

## Scope Deviations / Known Limitations

- Scope deviations: **无**。Owner 的补充“Plan 不常驻某日列表”已落实，无 Reminder/Memo/Unscheduled 预建区域。
- 没有声明 Owner focused re-UAT 或 TA-1A PASS。D-004 记录的首轮真实 tray/persistence/backup 已通过项仍由本轮工程回归保护；本轮没有另行声称执行 Owner 鼠标 tray UAT。
- 原生 backup 文件选择器/确认框仍沿用既有测试替换返回值的方式；本轮日程删除确认是真实 GUI 操作，没有被 stub。
- 分发仍未签名；无 installer、auto-update、startup-at-login。
- 需要 05 在 exact final HEAD 上独立复审，之后再进行 focused Owner re-UAT；TA-1B 仍未授权。

## Direct 05 Handoff

```text
Repo: zhangchenjia21-dot/Workbench
Task: PWB-001 / UAT-C1
Branch: task/PWB-001-ta1a-first-usable-core
Correction Base: b3c286ef244cf52c5603a6cbfb99432da50071af
Correction Implementation: 629bf1ce9515590ac21f6a6c2d13913df1c0825d
Task Packet: docs/tasks/PWB-001/TASK.md
Addendum: docs/tasks/PWB-001/UAT_CORRECTION_ADDENDUM.md
Completion: docs/tasks/PWB-001/UAT_CORRECTION_COMPLETION.md
Review Target: exact final branch HEAD in Builder return
State: READY FOR 05 INDEPENDENT RE-REVIEW
```

直接交 `05代码审核与UAT`，不回 04 做第二次调度。
