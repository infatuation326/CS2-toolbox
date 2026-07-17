// 监控悬浮窗渲染模块负责采样展示和自适应尺寸。
const { bindFloatingDrag, escapeHtml } = window.cs2Ui;
const overlay = document.querySelector('#monitorOverlay');
const overlayGrid = document.querySelector('#overlayGrid');
const overlayStatus = document.querySelector('#overlayStatus');

const metricDefinitions = [
  { id: 'fps', label: 'FPS', read: snapshot => formatMetric(snapshot.fps, '') },
  { id: 'cpuUsage', label: 'CPU 占用', read: snapshot => formatMetric(snapshot.cpuUsage, '%') },
  { id: 'gpuUsage', label: 'GPU 占用', read: snapshot => formatMetric(snapshot.gpuUsage, '%') },
  { id: 'gpuTemp', label: 'GPU 温度', read: snapshot => formatMetric(snapshot.gpuTemp, '°C') },
  { id: 'cpuTemp', label: 'CPU 温度', read: snapshot => formatMetric(snapshot.cpuTemp, '°C') },
  { id: 'vram', label: '显存', read: snapshot => snapshot.vramUsed == null || snapshot.vramTotal == null ? '--' : `${snapshot.vramUsed}/${snapshot.vramTotal} MB` },
  { id: 'gpuPower', label: '显卡功耗', read: snapshot => formatMetric(snapshot.gpuPower, ' W') },
  { id: 'gpuVoltage', label: '显卡电压', read: snapshot => formatMetric(snapshot.gpuVoltage, ' V') },
];
const defaultItems = ['cpuUsage', 'gpuUsage', 'gpuTemp', 'vram'];
const allowedColors = new Set(['green', 'blue', 'amber', 'white', 'red']);

let settings = {
  enabled: true,
  monitorOverlay: {
    visible: false,
    color: 'green',
    opacity: 0.86,
    compact: false,
    items: defaultItems,
  },
};
let refreshTimer = null;

window.addEventListener('DOMContentLoaded', initializeMonitorOverlay);

async function initializeMonitorOverlay() {
  bindFloatingDrag(overlay, delta => window.cs2MonitorOverlay.moveBy(delta));
  overlay.addEventListener('dblclick', () => window.cs2MonitorOverlay.toggleMain());
  const state = await window.cs2MonitorOverlay.getState();
  settings = { ...settings, ...(state.settings || {}) };
  applySettings();
  startRefreshLoop();
}

window.cs2MonitorOverlay.onInit(state => {
  settings = { ...settings, ...(state.settings || {}) };
  applySettings();
  refreshOverlay();
});

window.cs2MonitorOverlay.onSettings(nextSettings => {
  settings = { ...settings, ...(nextSettings || {}) };
  applySettings();
  refreshOverlay();
});

function normalizeOverlaySettings() {
  const saved = settings.monitorOverlay || {};
  const allowedItems = new Set(metricDefinitions.map(item => item.id));
  const items = Array.isArray(saved.items)
    ? saved.items.filter(item => allowedItems.has(item))
    : [];
  const opacity = Number(saved.opacity);
  return {
    visible: settings.enabled !== false && saved.visible !== false,
    color: allowedColors.has(saved.color) ? saved.color : 'green',
    opacity: Number.isFinite(opacity) ? Math.max(0.45, Math.min(1, opacity)) : 0.86,
    compact: Boolean(saved.compact),
    items: items.length ? items : defaultItems,
  };
}

function applySettings() {
  const overlaySettings = normalizeOverlaySettings();
  document.body.classList.toggle('is-compact', overlaySettings.compact);
  ['green', 'blue', 'amber', 'white', 'red'].forEach(color => {
    document.body.classList.toggle(`color-${color}`, color === overlaySettings.color);
  });
  document.documentElement.style.setProperty('--overlay-opacity', overlaySettings.opacity.toFixed(2));
  requestFitContent();
}

function startRefreshLoop() {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshOverlay();
  refreshTimer = window.setInterval(refreshOverlay, 2000);
}

async function refreshOverlay() {
  const overlaySettings = normalizeOverlaySettings();
  if (!overlaySettings.visible) return;
  try {
    const snapshot = await window.cs2MonitorOverlay.getSnapshot();
    renderSnapshot(snapshot, overlaySettings);
  } catch {
    overlayStatus.textContent = '读取失败';
    renderSnapshot(null, overlaySettings);
  }
}

function renderSnapshot(snapshot, overlaySettings) {
  const definitions = metricDefinitions.filter(item => overlaySettings.items.includes(item.id));
  overlayStatus.textContent = snapshot?.at ? new Date(snapshot.at).toLocaleTimeString('zh-CN', { hour12: false }) : '等待数据';
  overlayGrid.innerHTML = definitions.map(item => `
    <div class="metric metric--${escapeHtml(item.id)}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(snapshot ? item.read(snapshot) : '--')}</strong>
    </div>
  `).join('');
  requestFitContent();
}

function requestFitContent() {
  window.requestAnimationFrame(() => {
    const width = Math.ceil(Math.max(260, overlay.scrollWidth));
    const height = Math.ceil(Math.max(54, overlay.scrollHeight));
    window.cs2MonitorOverlay.fitContent?.({ width, height });
  });
}

function formatMetric(value, suffix) {
  return value == null ? '--' : `${value}${suffix}`;
}
