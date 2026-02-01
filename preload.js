const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('comfyui', {
  loadConfig: () => ipcRenderer.invoke('app:loadConfig'),
  health: (payload) => ipcRenderer.invoke('comfyui:health', payload),
  objectInfo: (payload) => ipcRenderer.invoke('comfyui:objectInfo', payload),
  queuePrompt: (payload) => ipcRenderer.invoke('comfyui:queue', payload),
  history: (payload) => ipcRenderer.invoke('comfyui:history', payload),
  queueStatus: (payload) => ipcRenderer.invoke('comfyui:queueStatus', payload),
  interrupt: (payload) => ipcRenderer.invoke('comfyui:interrupt', payload),
  uploadImage: (payload) => ipcRenderer.invoke('comfyui:uploadImage', payload),
  connectWs: (payload) => ipcRenderer.invoke('comfyui:connect', payload),
  disconnectWs: () => ipcRenderer.invoke('comfyui:disconnect'),
  openOutput: (path) => ipcRenderer.invoke('app:openOutput', path),
  onWsMessage: (callback) => ipcRenderer.on('comfyui:ws', (_event, data) => callback(data))
});
