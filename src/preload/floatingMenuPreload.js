// 悬浮菜单预加载层负责菜单事件和操作转发。
const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const wrapped = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld('cs2FloatingMenu', {
  onOpen: callback => subscribe('floating-menu:open', callback),
  runAction: (source, action) => ipcRenderer.invoke('floating-menu:action', source, action),
  close: () => ipcRenderer.invoke('floating-menu:close'),
});
