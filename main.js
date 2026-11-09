const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');

const url = require('url');
const path = require('path');
const fs = require('fs');
const beautify = require('js-beautify').html;
const isDev = process.mainModule.filename.indexOf('app.asar') === -1;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
    }
  });
  mainWindow.removeMenu();
  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));
  if (isDev) {
    // Open the DevTools.
    //BrowserWindow.addDevToolsExtension('<location to your react chrome extension>');
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => mainWindow = null);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('call-load', (event, arg) => load());
ipcMain.on('call-save', (event, arg) => save(arg));
ipcMain.on('call-saveAs', (event, arg) => saveas(arg));
ipcMain.on('call-quit', (event, arg) => app.quit());


// TINY MCE-SCRIPT

let current_file;      // full path of the file being edited, or null
let working_directory;

function show_error(title, err) {
  dialog.showErrorBox(title, String(err && err.message || err));
}

async function load() {
  try {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], defaultPath: working_directory });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) return;
    const file = result.filePaths[0];
    const data = await fs.promises.readFile(file, 'utf8');
    set_current_file(file);
    mainWindow.webContents.send('new-file', data);
  } catch (err) {
    show_error('Could not open file', err);
  }
}

async function save(output) {
  if (!current_file) return saveas(output);
  try {
    await fs.promises.writeFile(current_file, beautify(output, { indent_size: 2 }));
  } catch (err) {
    show_error('Could not save file', err);
  }
}

async function saveas(output) {
  const options = {
    filters: [
      { name: 'html', extensions: ['htm', 'html'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: current_file || working_directory
  };
  try {
    const result = await dialog.showSaveDialog(mainWindow, options);
    if (result.canceled || !result.filePath) return;
    set_current_file(result.filePath);
    await save(output);
  } catch (err) {
    show_error('Could not save file', err);
  }
}

function set_current_file(file) {
  current_file = file;
  working_directory = path.dirname(file);
  mainWindow.webContents.send('change-cwd', working_directory);
}
