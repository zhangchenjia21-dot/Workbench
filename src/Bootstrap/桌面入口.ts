import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
} from "electron";
import { join } from "node:path";
import {
  openWorkbench,
  localDate,
  type Workbench,
} from "../个人状态/L3_外交层/状态公开接口";

let mainWindow: BrowserWindow;
let tray: Tray;
let state: Workbench;
let exiting = false;
// 打包测试仅改变数据目录并暴露生命周期观察点，不替代真实业务或托盘处理函数。
if (process.env.PWB_TEST_USER_DATA)
  app.setPath("userData", process.env.PWB_TEST_USER_DATA);
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  app.on("second-instance", () => restoreWindow());
  app.on("activate", () => restoreWindow());
  app.on("before-quit", () => {
    exiting = true;
  });
  app.on("will-quit", () => {
    state?.close();
    tray?.destroy();
  });
  app
    .whenReady()
    .then(start)
    .catch((error) => {
      dialog.showErrorBox("Workbench 无法启动", String(error));
      app.exit(1);
    });
}
function restoreWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function exitApp(): void {
  exiting = true;
  app.quit();
}
async function start(): Promise<void> {
  state = openWorkbench(join(app.getPath("userData"), "personal-state.sqlite"));
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 600,
    show: false,
    backgroundColor: "#fafafa",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.removeMenu();
  mainWindow.on("close", (event) => {
    if (!exiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  // 自带不依赖外部文件的 16×16 不透明图标；真实 Tray 对象贯穿应用生命周期。
  const pixels = Buffer.alloc(16 * 16 * 4);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const mark =
        x >= 3 &&
        x <= 12 &&
        y >= 3 &&
        y <= 12 &&
        (x === 3 || x === 12 || y === 12 || (x === 7 && y >= 7));
      const offset = (y * 16 + x) * 4;
      pixels.set(mark ? [255, 255, 255, 255] : [235, 99, 37, 255], offset);
    }
  tray = new Tray(
    nativeImage.createFromBitmap(pixels, { width: 16, height: 16 }),
  );
  tray.setToolTip("Personal Workbench");
  tray.on("click", restoreWindow);
  tray.on("double-click", restoreWindow);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "打开 Workbench", click: restoreWindow },
      { type: "separator" },
      { label: "退出 Workbench", click: exitApp },
    ]),
  );
  if (process.env.PWB_TEST_USER_DATA)
    Object.assign(globalThis, {
      pwbLifecycle: { tray, restoreWindow, exitApp },
    });
  const handle = (channel: string, fn: (...args: never[]) => unknown) =>
    ipcMain.handle(channel, async (event, ...args) => {
      if (
        event.sender !== mainWindow.webContents ||
        event.senderFrame !== mainWindow.webContents.mainFrame
      )
        throw new Error("非法调用来源");
      try {
        return await fn(...(args as never[]));
      } catch (error) {
        if (error instanceof AggregateError) {
          dialog.showErrorBox("恢复失败", error.message);
          app.exit(1);
        }
        throw error;
      }
    });
  handle("state:view", () => state.view());
  handle("state:track", (id, draft) => state.saveTrack(id, draft));
  handle("state:item", (id, draft) => state.saveItem(id, draft));
  handle("state:delete-items", (date, ids) => state.deleteItems(date, ids));
  handle("state:vector", (id, draft) => state.saveVector(id, draft));
  handle("state:ack", (date, source, flag) => {
    if (date !== localDate()) throw new Error("本地日期已改变，请刷新 Today");
    state.acknowledge(date, source, flag);
  });
  handle("state:backup", async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "备份 Workbench",
      defaultPath: `Workbench-${Date.now()}.sqlite`,
      filters: [{ name: "SQLite 备份", extensions: ["sqlite"] }],
    });
    if (result.canceled || !result.filePath) return null;
    state.backup(result.filePath);
    return result.filePath;
  });
  handle("state:restore", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择 Workbench 备份",
      properties: ["openFile"],
      filters: [{ name: "SQLite 备份", extensions: ["sqlite"] }],
    });
    if (result.canceled) return null;
    const confirmation = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      message: "用此备份替换当前数据？",
      detail: "将先保存当前数据的安全备份，再验证并恢复所选文件。",
      buttons: ["取消", "恢复"],
      defaultId: 0,
      cancelId: 0,
    });
    if (confirmation.response !== 1) return null;
    return state.restore(result.filePaths[0]);
  });
  await mainWindow.loadFile(join(__dirname, "index.html"));
  mainWindow.show();
}
