# COMPLETION｜PWB-001｜TA-1A First Usable Core Vertical

- Task ID: `PWB-001`
- Result: `IMPLEMENTED`
- State: `IMPLEMENTED / READY FOR INDEPENDENT REVIEW`
- Task Branch: `task/PWB-001-ta1a-first-usable-core`
- Formal Code Base SHA: `87d1aba19ab67ea8e87c592447d9f982eca79c04`
- Task Packet Commit SHA: `920a6efd6cac1168d2b1f666e876b8fa74e86840`
- Implementation Commit SHA before Completion Report: `eb23738adc0157905b9d21a51682d071b023d2fa`
- Final Branch HEAD: returned in Builder chat after this report is committed; this report/evidence commit adds no production changes.
- Recommended Next Action: `05 INDEPENDENT REVIEW`

## Implementation Summary

交付可直接运行的 Windows Electron TA-1A 纵向：维护 Thin Tracks、单次日程、Current Vector，在 Plan 月历查看和编辑，并由 Today 派生当天信息。确认仅存日期/来源/布尔值；改名和生命周期变更不破坏 stable ID 关联。

SQLite 是唯一 canonical store，位于 per-user userData。支持事务写入、重启、真实未提交进程中断恢复、独立一致性快照、无效备份拒绝、staged restore、恢复前安全快照、有序事务 migration 与升级前安全备份。恢复重开失败有补偿；补偿失败宿主停止。应用关闭隐藏至真实 Tray，同一 restore handler 恢复已有窗口；真实 Exit 结束进程。

Primary Purpose / Core Value 的真实维护路径已经具备。低维护成本、Today 清晰度、Thin Track 自然程度和长期驻留价值尚待 Owner 真实数据 UAT，Builder 不作 Product PASS 或 TA-1A PASS 声明。

## Changed Files / Areas

- `src/个人状态/`：L0 日期/字段契约、L1 SQLite/恢复机制、L2 维护事务与投影、L3 公开入口。
- `src/桌面界面/L3_外交层/`：IPC DTO、Today / Plan / Tracks 页面及样式。
- `src/Bootstrap/`：Electron 生命周期、受限 IPC、preload、renderer 启动。
- `测试/`：领域和持久化/故障集成测试。
- `scripts/`：构建、依赖方向检查、packaged UI/生命周期验证。
- `package.json` / `package-lock.json` / `tsconfig.json` / `eslint.config.mjs`：锁定工具链与验证命令。
- `.github/workflows/windows.yml`：最小 Windows CI 和产物上传。
- `README.md`、`实现说明.md`、本报告与 `证据/`：使用、归层、failure matrix、验收证据。

Frozen Product / Route / Architecture 未修改；Task Packet 未修改。没有 TA-1B / Deferred 表、列、行为或平台脚手架。

## Chosen Implementation Details

| 选择 | 实现与理由 |
|---|---|
| renderer/UI stack | TypeScript、React 19.2、esbuild；普通表单、原生 dialog、系统字体，无外部字体/服务 |
| SQLite binding/data access | Electron 40 内置 node:sqlite，直接参数化 SQL，无 ORM/第三方 native binding；主进程单连接、DELETE journal、FULL synchronous |
| packaging | electron-builder 26.0.12，Windows x64 目录分发，整个 win-unpacked 可复制运行 |
| tests | node:test + tsx；真实 SQLite/temp 文件；真实子进程 kill；Playwright 操作 packaged exe 普通 UI |
| schema | v1 Track/Plan，v2 本阶段要求的 acknowledgement；空库一笔事务初始化，旧库先 snapshot 后按序升级 |
| layering | 两个实际模块：个人状态、桌面界面；跨模块仅 L3，Bootstrap 为组合根，不创建空层 |

## Acceptance Matrix

PASS 表示 Builder 工程证据，不替代 05 Independent Review、Reality Gate 或 Owner Product UAT。

| Gate | Result | Evidence |
|---|---|---|
| AC-01 Boot / Entry | PASS | packaged isPackaged=true，file: 页面，无 dev server，启动 Today |
| AC-02 Track Semantics | PASS | UI 创建/编辑/Active→Completed→Archived→Active；改名仍显示关联，领域测试保留 ID |
| AC-03 Plan Single Item | PASS | 普通 UI 创建、关联、编辑，月历日期选择及日程详情；领域测试日期/时间变更 |
| AC-04 Current Vector | PASS | 相邻日接受；含端点重叠 create/edit 拒绝且 DB 不变；UI 重叠报错 |
| AC-05 Today Derivation | PASS | 受控日期只返回生效 Vector/当日 item；未来 item 排除；UI 对应 canonical source |
| AC-06 Acknowledgement | PASS | source facts 前后 deepEqual；确认/撤销；packaged 重启后同日确认保留 |
| AC-07 Restart Durability | PASS | packaged 两次启动、恢复后持久化；真实子进程在未提交 UPDATE 后 SIGKILL，重开原值且 integrity 成功 |
| AC-08 Backup | PASS | VACUUM INTO 独立快照，可独立打开且关系相等；packaged UI 触发备份 |
| AC-09 Restore Guardrails | PASS | 非 SQLite / 伪造 Workbench 结构拒绝，live 不变；安全快照/staging/close/replace/reopen；reopen 失败补偿及补偿失败测试 |
| AC-10 Migration / Rollback | PASS | v1 fixture 真实启动升级到 v2，stable Track/item link 保留；注入 DDL/data/version 失败回滚；启动失败关闭连接，失败与成功升级前均留安全快照；旧备份恢复时迁移 |
| AC-11 Packaged Tray | PASS | Windows runtime 真 Tray 存在，close 后隐藏且进程存活；Tray click 事件触发生产共享 handler，原窗口 ID/visible/focused 验证；真实 Exit code 0 |
| AC-12 Scope Integrity | PASS | base→implementation 仅 TA-1A；SQLite 唯一 live truth；依赖方向检查通过；无 frozen 源变更 |
| AC-13 Direct Usability | PASS | Playwright 通过可见表单完成创建/编辑/筛选/月历/确认；Today/Plan/Tracks 页面截图见证据目录 |

## Validation Commands + Exact Results

本地 Windows `10.0.26200`；Node `24.11.0`；packaged Electron `40.0.0` / 内嵌 Node `24.11.1` / SQLite `3.50.4`。

| 实际命令 | 结果 |
|---|---|
| `npm ci --no-audit --no-fund` | exit 0，560 packages；仅关闭审计/资助提示，与 npm ci 使用相同 lockfile 安装语义 |
| `npm run lint` | exit 0；ESLint + Architecture dependencies PASS |
| `npm run typecheck` | exit 0 |
| `npm test` / `npm run test` | exit 0；4 tests, 4 pass, 0 fail |
| `npm run test:integration` | exit 0；4 tests, 4 pass, 0 fail |
| `npm run build` | exit 0；main/preload/renderer 生产构建 |
| `npm run package:win` | exit 0；Windows x64 packaged 目录 |
| `npm run test:packaged` | exit 0；6 组验收路径完成；已在 implementation SHA 上复核 |
| `git diff --check` / `git diff --cached --check` | exit 0 |

逐命令记录：[validation.json](证据/validation.json)。日志与 UI 截图在 [证据目录](证据/)。Packaged 详细版本与检查：[packaged.json](证据/packaged.json)。

## Windows Packaged Evidence

本地产物：`D:/AI/Projects/Workbench/out/win-unpacked/Workbench.exe`，必须连同整个目录使用。

Implementation SHA: `eb23738adc0157905b9d21a51682d071b023d2fa`。

- Workbench.exe SHA-256: `258131fa13f34f84b8d0dea9a2e35d8d5e2dc20fd133449763496e5912eefce2`
- resources/app.asar SHA-256: `d686f2292676702e11f536c9721c5e18067473996c501ce85634d078cb66da72`

这些指纹对应本地被测试产物；CI 构建指纹应以该 CI artifact 内 packaged.json 为准。

## Windows CI Run / Artifact Evidence

- Run: [34024008039](https://github.com/zhangchenjia21-dot/Workbench/actions/runs/34024008039), Windows job `101461638742`, **success**。
- Exact CI implementation SHA: `eb23738adc0157905b9d21a51682d071b023d2fa`。
- 全部 npm ci / lint / typecheck / domain / integration / build / package / packaged 步骤与上传步骤 success。
- [下载 Windows artifact](https://github.com/zhangchenjia21-dot/Workbench/actions/runs/34024008039/artifacts/9986467482)：`PWB-001-windows-eb23738adc0157905b9d21a51682d071b023d2fa`，ID `9986467482`，142416984 bytes，包含完整 win-unpacked 和 packaged JSON/截图。
- Artifact archive digest: `sha256:b305ae0d4a10c3fc0c1126227fd6f30bf32aa0b833537ab3046671a4e34f416d`；当前保留至 2026-09-20，之后可按锁定命令重建。
- 已检查 job 步骤、job 日志中的 packaged PASS 与 artifact 元数据。CI exe/app.asar 两项 SHA-256 与上面本地值完全一致。
- 提取记录见 [windows-ci.json](证据/windows-ci.json)。没有把 artifact 存在等同于测试成功，PASS 来自真实 job 日志及 runtime 断言。

## Known Limitations

1. Owner 通知区域图标实际可见、真实鼠标唤起/关闭隐藏/Tray Exit 检查仍 **NOT RUN / REQUIRED BEFORE TA-1A EXIT**。程序触发 Tray 事件不能替代鼠标证据。
2. Owner real-data Product UAT 与 05 Independent Review 尚未执行。
3. 原生备份文件选择框和恢复确认框在自动化中替换返回值；正常产品仍调用 Windows 原生 dialog。其真实鼠标交互尚未作为 Builder 自动化证据。
4. 当前分发未签名，无安装器、自动更新、开机启动；必须复制整个打包目录。依赖安装有上游 deprecated 提示，node:sqlite 仍带 ExperimentalWarning；固定版本已通过本次 Windows 验证。
5. 单次日程限定同一天、结束晚于开始；不支持删除（Packet 允许只实现 create/edit）、循环或跨日框架。恢复/升级安全快照保留在 userData/safety，无自动历史管理产品。
6. 主进程同步 SQLite 适合本次个人数据规模，未作大规模或长时性能承诺。

## Scope Deviations

无。未改变冻结契约，也未引入 TA-1B / Deferred 能力。

## Unexpected Findings

- 初始 cwd 为空，先克隆用户指定分支；git schannel 凭据错误通过单命令 OpenSSL backend 解决，没有关闭 TLS 校验。
- 克隆后沙箱进程/文件 helper 初始化失败；通过自动审批允许的原生 PowerShell 执行，未改权限配置。
- Electron 首次下载 ECONNRESET；一次重新安装成功，随后 npm ci 成功。
- 首轮 packaged 测试因状态下拉框精确 accessible-name 定位超时；改为 combobox 名称定位后通过，没有伪造业务成功。
- 收尾发现异步恢复错误需 await 才能进入宿主致命错误边界，已修正并复测。
- 无认证 GitHub REST 读取遇速率限制，改用已连接 GitHub 工具读取 CI；未改变仓库设置。

## Expanded-read Context

仅增加读取用户提供的四层架构、中文命名、语义注释技能及 UI/UX 技能，以满足新建工程约定与普通桌面表单可用性。未读取探索分支实现或以 G0.4 spike 替代 production proof；未扩大产品 scope。

## 05 Independent Review Handoff

```text
Repo: zhangchenjia21-dot/Workbench
Task ID: PWB-001
Formal Base: 87d1aba19ab67ea8e87c592447d9f982eca79c04
Task Branch: task/PWB-001-ta1a-first-usable-core
Task Packet: docs/tasks/PWB-001/TASK.md
Completion Report: docs/tasks/PWB-001/COMPLETION.md
Review Target: exact final branch HEAD returned in Builder chat
```

停在 `IMPLEMENTED / READY FOR INDEPENDENT REVIEW`。未合并 main；未宣告 Product PASS、TA-1A PASS 或 READY FOR OWNER UAT。
