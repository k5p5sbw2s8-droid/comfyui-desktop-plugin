const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

let mainWindow;
let wsClient;

const defaultConfigPath = path.join(__dirname, 'configs', 'parameters.schema.json');

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('app:loadConfig', async () => {
  const schema = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));
  const abilities = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'configs', 'abilities.json'), 'utf-8')
  );
  const workflowDir = path.join(__dirname, 'configs', 'workflows');
  const templates = {};
  for (const file of fs.readdirSync(workflowDir)) {
    if (file.endsWith('.json')) {
      const task = file.replace('.json', '');
      templates[task] = JSON.parse(fs.readFileSync(path.join(workflowDir, file), 'utf-8'));
    }
  }
  return { schema, abilities, templates };
});

ipcMain.handle('comfyui:queue', async (_event, payload) => {
  const { host, port, prompt } = payload;
  const response = await fetch(`http://${host}:${port}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const data = await response.json();
  return data;
});

ipcMain.handle('comfyui:history', async (_event, payload) => {
  const { host, port, promptId } = payload;
  const response = await fetch(`http://${host}:${port}/history/${promptId}`);
  return response.json();
});

ipcMain.handle('comfyui:interrupt', async (_event, payload) => {
  const { host, port } = payload;
  const response = await fetch(`http://${host}:${port}/interrupt`, { method: 'POST' });
  return response.json();
});

ipcMain.handle('comfyui:connect', async (_event, payload) => {
  const { host, port } = payload;
  if (wsClient) {
    wsClient.close();
  }
  wsClient = new WebSocket(`ws://${host}:${port}/ws`);

  wsClient.on('message', (data) => {
    mainWindow.webContents.send('comfyui:ws', data.toString());
  });

  wsClient.on('close', () => {
    mainWindow.webContents.send('comfyui:ws', JSON.stringify({ type: 'closed' }));
  });

  return { status: 'connecting' };
});

ipcMain.handle('comfyui:disconnect', async () => {
  if (wsClient) {
    wsClient.close();
    wsClient = null;
  }
  return { status: 'closed' };
});

ipcMain.handle('app:openOutput', async (_event, outputPath) => {
  if (outputPath) {
    await shell.openPath(outputPath);
  }
});
