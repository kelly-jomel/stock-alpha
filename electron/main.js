const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'Stock Alpha - Technical Analysis Terminal',
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Detect available port (defaults to 3000, falls back to 3001)
  const candidatePorts = [3000, 3001, 3002];
  
  function tryConnect(ports, index = 0) {
    if (index >= ports.length) {
      mainWindow.loadFile(path.join(__dirname, 'loading.html'));
      setTimeout(() => tryConnect(ports, 0), 1000);
      return;
    }

    const p = ports[index];
    const testUrl = `http://localhost:${p}`;
    
    http.get(testUrl, (res) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        mainWindow.loadURL(testUrl);
      } else {
        tryConnect(ports, index + 1);
      }
    }).on('error', () => {
      tryConnect(ports, index + 1);
    });
  }

  tryConnect(candidatePorts);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
