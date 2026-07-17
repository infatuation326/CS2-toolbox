// 游戏小窗预加载层负责小窗与主进程之间的受限通信。
const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const wrapped = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld('cs2Orb', {
  getState: () => ipcRenderer.invoke('settings:get'),
  onInit: callback => subscribe('app:init', callback),
  onSettings: callback => subscribe('settings:update', callback),
  onGame: callback => subscribe('game:update', callback),
  onBomb: callback => subscribe('bomb:update', callback),
  toggleMain: () => ipcRenderer.invoke('window:toggle-main'),
  moveBy: delta => ipcRenderer.invoke('floating-window:move-by', delta),
});
