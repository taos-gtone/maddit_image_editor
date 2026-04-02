const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Image operations
  loadImage: (filePath) => ipcRenderer.invoke('image:load', filePath),
  loadImageFromBytes: (bytes) => ipcRenderer.invoke('image:loadFromBytes', bytes),
  loadImageFromClipboard: () => ipcRenderer.invoke('image:loadFromClipboard'),
  resizePreview: (request) => ipcRenderer.invoke('image:resizePreview', request),
  saveImage: (request) => ipcRenderer.invoke('image:save', request),
  cropImage: (request) => ipcRenderer.invoke('image:crop', request),
  fetchImageUrl: (url) => ipcRenderer.invoke('image:fetchUrl', url),

  // Dialogs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultName, format) => ipcRenderer.invoke('dialog:saveFile', defaultName, format),

  // Templates
  getTemplates: () => ipcRenderer.invoke('template:getAll'),
  addTemplate: (name, width, height) => ipcRenderer.invoke('template:add', name, width, height),
  updateTemplate: (id, name, width, height) => ipcRenderer.invoke('template:update', id, name, width, height),
  deleteTemplate: (id) => ipcRenderer.invoke('template:delete', id),
  restoreBuiltInTemplates: () => ipcRenderer.invoke('template:restoreBuiltIns'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Banner
  fetchBanners: () => ipcRenderer.invoke('banner:fetch'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // File drop from main process
  onFileDrop: (callback) => ipcRenderer.on('file:dropped', (_event, filePath) => callback(filePath)),
});
