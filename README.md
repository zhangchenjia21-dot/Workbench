# Personal Workbench

个人工作台：让项目近况进入 Today，再由你判断如何更新长期状态。保留已验收的 Today / Plan / Tracks。

## 一键启动

Owner 直接双击仓库根目录的 **[启动 Workbench.cmd](启动%20Workbench.cmd)** 即可打开已打包的 Workbench，无需打开终端或寻找 exe。入口按自身位置查找打包目录，与当前工作目录无关；缺少打包应用时会显示中文提示。

## 体验项目近况

进入 Sources，连接一个 GitHub 仓库（公开或当前账号有权限的私有仓库）。应用会汇集主线最近提交、开放 PR 和当前提交的 Actions 验证，之后每 30 分钟检查一次。Today 展示未读变化，查看依据可回到原始 GitHub 页面。

选择“整理为 Track”或“查看状态建议”，对照并编辑文字，再确认写入新建或已有 Track。无需重复抄录项目事实；目标、阶段、日程和生命周期由你维护。已看过的同一近况不会重复提醒。失败时保留旧快照及检查时间。

最多连接 3 个仓库。私有仓库复用 Git for Windows / Git Credential Manager 在 Windows 保存的 GitHub 登录；没有登录或登录过期时，可在 Sources 或连接弹窗点击“登录 GitHub / 重新登录 GitHub”，在官方浏览器页面完成授权。无需在 Workbench 中粘贴 Token；Workbench 不保存凭据到 SQLite、界面或备份。只读官方 API，不向 GitHub 上传内容。私有仓库的事实内容会进入本地数据库及其备份，请按私人数据保存备份。摘要基于有限事实规则，不分析代码语义，也不把 CI 成功当作产品验收通过。

## 维护者运行与打包

Windows x64，Node.js 24.11.0 或更高版本。

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm start
npm run package:win
npm run test:packaged
```

打包输出：`out/win-unpacked/Workbench.exe`。分发时复制整个 `win-unpacked` 目录，不能只复制 exe。无需开发服务器。当前为未签名目录分发，无安装器或自动更新。

## 使用

- 启动进入 Today。当前注意力是独立只读区域，在 Plan 中维护；今日日程可编辑，“今日确认”只改变日程当天视觉状态。
- Tracks 创建长期事项，维护目标、阶段、真实状态、近期方向；默认进行中，可切换已完成与已归档。
- Plan 月历格优先显示日程标题。左键打开当天详情，可新建、编辑、单条或多选删除；右键提供新建、编辑、清空当天日程（须确认）。主页面不常驻展示某日列表。关联 Track 可选；改名不丢失关系。
- Plan 可切换月/周视图并导航。循环日程支持每天或每周指定星期、开始/可选结束日期和本地时间。日期详情中的循环编辑/删除先选“仅这一次 / 整个循环”。单次移动保留原 occurrence 身份；整循环编辑如有例外，须确认清除旧例外，不自动重映射。折叠的“循环定义”入口也可维护已结束或暂无 occurrence 的循环。
- 当天多选删除和右键清空仅作用于单次日程；不会批量推断循环范围。循环日程逐条维护。
- Reminder 在指定日期/可选时间提示信息；Memo 在展示日期重现文字；Unscheduled 维护近期已决定但时间未定的事项。三者各有独立 Plan 创建、编辑和删除入口。
- Today 展示当天循环 occurrence、Reminder、Memo；未来提醒/备忘和 Unscheduled 不进入 Today。确认仅适用于日程与 occurrence，信息对象与 Vector 没有完成语义。
- Current Vector 用独立表单维护，开始与结束日期均包含在区间内，重叠会拒绝保存。
- 左下角可备份、恢复。备份请使用新文件名；恢复前有确认，并自动保存当前数据的安全快照。
- 关闭窗口隐藏到托盘；点击托盘图标或“打开 Workbench”恢复。托盘“退出 Workbench”真正退出。

数据库位于 Electron 的 per-user `userData/personal-state.sqlite`（Windows 通常为 `%APPDATA%/personal-workbench/`）；安全快照在同目录的 `safety/`。首次启动为空库。已有 v1/v2/v3 数据库自动经事务升级到 v4（增量保存项目来源与快照，既有身份不变），升级前生成 safety 快照；不需要删除或重建 Owner 数据。测试只在独立临时目录创建虚构数据。

自动化打包验证覆盖普通 UI、IPC、SQLite、重启和真实托盘处理函数；原生文件选择器在测试中替换返回值。`evidence/packaged.json` 与 TA-1A / Complete V0 页面截图记录结果。实际 Owner Complete V0 UAT 由 05 后续组织，程序触发托盘事件不能替代真实鼠标体验。

## 范围与权威

本轮基于 Owner Autonomous Productization 授权。产品选择与 contract 边界见 `docs/productization/产品选择.md`，完成情况见 `docs/productization/COMPLETION.md`。Electron、SQLite canonical ownership、稳定身份和安全备份恢复契约保持不变。原 PWB-001 / 002 / 003 的任务与证据保留在 `docs/tasks/`。

私有仓库登录修订见 `docs/productization/私有仓库连接修订.md`。未增加 ChatGPT 网页集成、同步写回、通用 Agent/Plugin 平台或其它无实际 consumer 的能力。工程验证与独立产品验收分开，由 05 做 Independent Review + Product Reality Review。
