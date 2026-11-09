// Launches the real app and checks that the editor window loads and
// TinyMCE initialises. Run with: electron test/smoke.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

const TIMEOUT_MS = 60000;
const errors = [];

app.on('browser-window-created', (event, win) => {
  win.webContents.on('console-message', (e, level, message, line, source) => {
    if (level >= 3) errors.push(`${source}:${line} ${message}`);
  });
});

require(path.join(__dirname, '..', 'main.js'));

function finish(code, msg) {
  console.log(msg);
  app.exit(code);
}

app.on('ready', () => {
  const started = Date.now();
  const timer = setInterval(async () => {
    if (Date.now() - started > TIMEOUT_MS) {
      clearInterval(timer);
      return finish(1, 'FAIL: editor did not initialise within ' + TIMEOUT_MS / 1000 + 's\n' + errors.join('\n'));
    }
    const win = BrowserWindow.getAllWindows()[0];
    if (!win || win.webContents.isLoading()) return;
    let ready = false;
    try {
      ready = await win.webContents.executeJavaScript(
        '!!(window.tinymce && tinymce.activeEditor && tinymce.activeEditor.initialized)');
    } catch (e) { /* page not ready yet */ }
    if (!ready) return;
    clearInterval(timer);
    if (errors.length) return finish(1, 'FAIL: console errors\n' + errors.join('\n'));
    finish(0, 'OK: editor initialised');
  }, 500);
});
