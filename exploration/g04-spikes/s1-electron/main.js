// G0.4 S1 Electron probe
// EXPLORATION / NOT CANONICAL ARCHITECTURE / NOT PRODUCTION COMMITMENT
const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

let win;
let tray;
let quitting = false;

function log(event, extra = {}) {
  const target = process.env.SPIKE_LOG || path.join(app.getPath('temp'), 'g04-electron-spike.jsonl');
  fs.appendFileSync(target, JSON.stringify({ ts: new Date().toISOString(), event, ...extra }) + '\n');
}

function restoreFromTray(source = 'tray') {
  if (!win) return;
  win.show();
  win.restore();
  win.focus();
  log('restore', { source, visible: win.isVisible(), focused: win.isFocused() });
}

function createTrayIcon() {
  // Tiny generated PNG avoids shipping a production asset into this disposable spike.
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVR42mNgGAWjYBSMglEwCkb9T0z8T2QYGBgY/jMwMDD8Z2BgYPgPAABG7gQv49s0WQAAAABJRU5ErkJggg=='
  );
  tray = new Tray(icon);
  tray.setToolTip('G0.4 Electron Spike');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Restore', click: () => restoreFromTray('menu') },
    { label: 'Exit', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', () => restoreFromTray('click'));
  log('tray-created', { destroyed: tray.isDestroyed() });
}

async function selfTest() {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(800);
  log('selftest-start', { packaged: app.isPackaged, exe: process.execPath, visible: win.isVisible() });

  win.close();
  await wait(500);
  if (win.isVisible()) {
    log('selftest-fail', { step: 'close-to-hide', visible: true });
    app.exit(21);
    return;
  }
  log('close-hidden', { visible: win.isVisible() });

  // Use the same handler as a real tray click/menu action. CI cannot physically click the shell icon.
  restoreFromTray('programmatic-shared-handler');
  await wait(500);
  if (!win.isVisible()) {
    log('selftest-fail', { step: 'restore', visible: false });
    app.exit(22);
    return;
  }

  log('selftest-pass', { packaged: app.isPackaged, trayAlive: !tray.isDestroyed(), visible: win.isVisible() });
  quitting = true;
  app.quit();
}

app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 480, height: 320, show: true });
  await win.loadFile(path.join(__dirname, 'index.html'));
  win.on('close', event => {
    if (!quitting) {
      event.preventDefault();
      win.hide();
      log('close-request-hidden', { visible: win.isVisible() });
    }
  });
  createTrayIcon();
  log('ready', { packaged: app.isPackaged, userData: app.getPath('userData'), exe: process.execPath });

  if (process.env.SPIKE_SELF_TEST === '1') {
    selfTest().catch(err => {
      log('selftest-error', { message: String(err && err.stack || err) });
      app.exit(23);
    });
  }
});

app.on('window-all-closed', event => {
  // Deliberately do nothing: tray-hosted app remains resident unless explicitly exited.
  log('window-all-closed');
});

app.on('before-quit', () => {
  quitting = true;
  log('before-quit');
});
