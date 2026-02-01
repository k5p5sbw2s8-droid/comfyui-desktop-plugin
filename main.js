const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

let mainWindow;
let wsClient;

const defaultConfigPath = path.join(__dirname, 'configs', 'parameters.schema.json');
const templatesPath = path.join(__dirname, 'workflows', 'templates');

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
  const templates = {};
  for (const file of fs.readdirSync(templatesPath)) {
    if (file.endsWith('.json')) {
      const task = file.replace('.json', '');
      templates[task] = JSON.parse(fs.readFileSync(path.join(templatesPath, file), 'utf-8'));
    }
  }
  return { schema, abilities, templates };
});

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return { error: 'Invalid JSON response' };
  }
};

const apiRequest = async ({ host, port, path: apiPath, options }) => {
  try {
    const response = await fetch(`http://${host}:${port}${apiPath}`, options);
    const data = await safeJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
};

ipcMain.handle('comfyui:health', async (_event, payload) => {
  const { host, port } = payload;
  const primary = await apiRequest({ host, port, path: '/system_stats', options: { method: 'GET' } });
  if (primary.ok) {
    return { ...primary, endpoint: '/system_stats' };
  }
  const fallback = await apiRequest({ host, port, path: '/queue', options: { method: 'GET' } });
  return { ...fallback, endpoint: '/queue' };
});

ipcMain.handle('comfyui:objectInfo', async (_event, payload) => {
  const { host, port } = payload;
  return apiRequest({ host, port, path: '/object_info', options: { method: 'GET' } });
});

ipcMain.handle('comfyui:queue', async (_event, payload) => {
  const { host, port, prompt } = payload;
  return apiRequest({
    host,
    port,
    path: '/prompt',
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }
  });
});

ipcMain.handle('comfyui:history', async (_event, payload) => {
  const { host, port, promptId } = payload;
  return apiRequest({ host, port, path: `/history/${promptId}`, options: { method: 'GET' } });
});

ipcMain.handle('comfyui:queueStatus', async (_event, payload) => {
  const { host, port } = payload;
  return apiRequest({ host, port, path: '/queue', options: { method: 'GET' } });
});

ipcMain.handle('comfyui:interrupt', async (_event, payload) => {
  const { host, port } = payload;
  return apiRequest({ host, port, path: '/interrupt', options: { method: 'POST' } });
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

ipcMain.handle('comfyui:uploadImage', async (_event, payload) => {
  const { host, port, filePath } = payload;
  try {
    const buffer = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('image', new Blob([buffer]), path.basename(filePath));
    form.append('type', 'input');
    const response = await fetch(`http://${host}:${port}/upload/image`, {
      method: 'POST',
      body: form
    });
    const data = await safeJson(response);
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
});

ipcMain.handle('app:openOutput', async (_event, outputPath) => {
  if (outputPath) {
    await shell.openPath(outputPath);
  }
});
