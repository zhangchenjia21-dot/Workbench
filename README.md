# Personal Workbench

PWB-002 · TA-1B Complete V0 implementation；保留已验收的 TA-1A / UAT-C1 行为。

## 一键启动

Owner 直接双击仓库根目录的 **[启动 Workbench.cmd](启动%20Workbench.cmd)** 即可打开已打包的 Workbench，无需打开终端或寻找 exe。入口按自身位置查找打包目录，与当前工作目录无关；缺少打包应用时会显示中文提示。

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

数据库位于 Electron 的 per-user `userData/personal-state.sqlite`（Windows 通常为 `%APPDATA%/personal-workbench/`）；安全快照在同目录的 `safety/`。首次启动为空库。已有 TA-1A v1/v2 数据库自动经事务升级到 v3，升级前生成 safety 快照；不需要删除或重建 Owner 数据。测试只在独立临时目录创建虚构数据。

自动化打包验证覆盖普通 UI、IPC、SQLite、重启和真实托盘处理函数；原生文件选择器在测试中替换返回值。`evidence/packaged.json` 与 TA-1A / Complete V0 页面截图记录结果。实际 Owner Complete V0 UAT 由 05 后续组织，程序触发托盘事件不能替代真实鼠标体验。

## 范围与权威

本轮仅实现 frozen TA-1B；任务及验收见 `docs/tasks/PWB-002/TASK.md`。不提供“这一次及以后”、AI/sync、Milestones、插件或完成统计等 Deferred 能力。Product/Route/Architecture 权威仍属于 Vibe-Coding 仓库，不在本仓库另建替代定义。

实现结构和恢复失败边界见 `docs/tasks/PWB-001/实现说明.md`。本轮状态与失败边界见 `docs/tasks/PWB-002/状态与失败矩阵.md`。工程就绪不等于 TA-1B / Complete V0 Product PASS，也不授权 TA-2。
