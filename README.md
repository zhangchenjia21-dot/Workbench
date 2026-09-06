# Personal Workbench

PWB-001 · TA-1A First Usable Core Vertical implementation.

## 运行与打包

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

- 启动进入 Today。当前注意力与今日日程均可直接编辑；“今日确认”只改变当天视觉状态。
- Tracks 创建长期事项，维护目标、阶段、真实状态、近期方向；默认进行中，可切换已完成与已归档。
- Plan 用月历选择日期，再添加或编辑单次日程。关联 Track 可选；改名不丢失关系。
- Current Vector 用独立表单维护，开始与结束日期均包含在区间内，重叠会拒绝保存。
- 左下角可备份、恢复。备份请使用新文件名；恢复前有确认，并自动保存当前数据的安全快照。
- 关闭窗口隐藏到托盘；点击托盘图标或“打开 Workbench”恢复。托盘“退出 Workbench”真正退出。

数据库位于 Electron 的 per-user `userData/personal-state.sqlite`（Windows 通常为 `%APPDATA%/personal-workbench/`）；安全快照在同目录的 `safety/`。首次启动为空库。测试只在独立临时目录创建虚构数据。

自动化打包验证覆盖普通 UI、IPC、SQLite、重启和真实托盘处理函数；原生文件选择器在测试中替换返回值。`evidence/packaged.json` 与三个页面截图记录结果。通知区域图标可见性和真实鼠标交互仍需 Owner 在 TA-1A Exit 前验证。

## 范围与权威

仅实现 TA-1A；任务及验收见 `docs/tasks/PWB-001/TASK.md`。未实现 recurrence、Reminder、Memo、Unscheduled、Week View 或其他 Deferred 产品功能。Product/Route/Architecture 权威仍属于 Vibe-Coding 仓库，不在本仓库另建替代定义。

实现结构和恢复失败边界见 `docs/tasks/PWB-001/实现说明.md`。工程就绪不等于 Product PASS 或 TA-1A PASS。
