// 监控悬浮窗预加载层负责状态读取和窗口控制通信。
const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const wrapped = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld('cs2MonitorOverlay', {
  getState: () => ipcRenderer.invoke('settings:get'),
  getSnapshot: () => ipcRenderer.invoke('monitor:get-snapshot'),
  fitContent: size => ipcRenderer.invoke('monitor-overlay:fit-content', size),
  moveBy: delta => ipcRenderer.invoke('floating-window:move-by', delta),
  onInit: callback => subscribe('app:init', callback),
  onSettings: callback => subscribe('settings:update', callback),
  toggleMain: () => ipcRenderer.invoke('window:toggle-main'),
});
