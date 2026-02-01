const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('comfyui', {
  loadConfig: () => ipcRenderer.invoke('app:loadConfig'),
  queuePrompt: (payload) => ipcRenderer.invoke('comfyui:queue', payload),
  history: (payload) => ipcRenderer.invoke('comfyui:history', payload),
  interrupt: (payload) => ipcRenderer.invoke('comfyui:interrupt', payload),
  connectWs: (payload) => ipcRenderer.invoke('comfyui:connect', payload),
  disconnectWs: () => ipcRenderer.invoke('comfyui:disconnect'),
  openOutput: (path) => ipcRenderer.invoke('app:openOutput', path),
  onWsMessage: (callback) => ipcRenderer.on('comfyui:ws', (_event, data) => callback(data))
});
