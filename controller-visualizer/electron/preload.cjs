const { contextBridge, ipcRenderer } = require('electron');

console.log("Preload script loaded");

contextBridge.exposeInMainWorld('api', {
  onInputEvent: (callback) => ipcRenderer.on('input-event', (_, data) => callback(data))
});