// 游戏小窗渲染模块负责展示 GSI 状态和可配置圆环。
const { bindFloatingDrag, applyThemeClass, applyAccentClass } = window.cs2Ui;
const orbCircumference = 2 * Math.PI * 43;
const defaultBombDurationMs = 38000;
const orb = document.querySelector('#orb');
const orbRing = document.querySelector('#orbRing');
const orbLabel = document.querySelector('#orbLabel');
const orbTime = document.querySelector('#orbTime');
const orbStatus = document.querySelector('#orbStatus');

let currentTheme = 'light';
let currentAccentColor = 'green';
let lowPerformanceMode = false;
let currentOrbSettings = {
  size: 92,
  textMode: 'auto',
  ringMode: 'auto',
};
let currentGame = {
  connected: false,
  phase: 'waiting',
  playerTeam: '',
  health: null,
  armor: null,
  roundKills: 0,
  roundKillHs: 0,
  phaseEndsIn: null,
  activeWeapon: '',
  mapName: '',
};
let currentBomb = {
  active: false,
  remainingMs: defaultBombDurationMs,
  progress: 1,
  danger: false,
  isCt: false,
  hasDefuseKit: false,
};

orbRing.style.strokeDasharray = orbCircumference;

window.addEventListener('DOMContentLoaded', initializeOrb);

async function initializeOrb() {
  warmUpOrbAnimations();
  const state = await window.cs2Orb.getState();
  applySettings(state.settings || {});
  currentGame = { ...currentGame, ...(state.game || {}) };
  currentBomb = state.bomb || currentBomb;
  renderOrb();
}

orb.addEventListener('dblclick', () => {
  window.cs2Orb.toggleMain();
});

bindFloatingDrag(orb, delta => window.cs2Orb.moveBy(delta));

window.cs2Orb.onInit(state => {
  applySettings(state.settings || {});
  currentGame = { ...currentGame, ...(state.game || {}) };
  currentBomb = state.bomb || currentBomb;
  renderOrb();
});

window.cs2Orb.onSettings(settings => {
  applySettings(settings || {});
  renderOrb();
});

window.cs2Orb.onBomb(bomb => {
  currentBomb = bomb || currentBomb;
  renderOrb();
});

window.cs2Orb.onGame(game => {
  currentGame = { ...currentGame, ...(game || {}) };
  renderOrb();
});

function warmUpOrbAnimations() {
  const warmup = document.createElement('div');
  warmup.className = 'orb-warmup';
  warmup.setAttribute('aria-hidden', 'true');
  warmup.innerHTML = `
    <div class="orb active danger">
      <svg viewBox="0 0 100 100" class="orb-ring">
        <circle cx="50" cy="50" r="43" class="orb-ring__bg"></circle>
        <circle cx="50" cy="50" r="43" class="orb-ring__fg"></circle>
      </svg>
      <div class="orb-core">
        <span>CS2</span>
        <strong>38.5</strong>
      </div>
      <div class="orb-status">正在提醒</div>
      <span class="orb-pulse"></span>
    </div>
  `;
  document.body.appendChild(warmup);
  warmup.getBoundingClientRect();
  requestAnimationFrame(() => {
    warmup.querySelector('.orb-ring__fg').style.strokeDashoffset = '80';
    setTimeout(() => warmup.remove(), 260);
  });
}

function applySettings(settings) {
  currentTheme = settings.theme || currentTheme;
  currentAccentColor = settings.accentColor || currentAccentColor;
  lowPerformanceMode = Boolean(settings.lowPerformanceMode);
  currentOrbSettings = normalizeOrbSettings(settings.orb || currentOrbSettings);
  applyTheme();
}

function normalizeOrbSettings(value = {}) {
  const textModes = new Set(['auto', 'status', 'fps', 'health', 'armor', 'roundKills', 'roundTime', 'bombTime', 'c4', 'map']);
  const ringModes = new Set(['auto', 'bombTime', 'roundTime', 'health', 'armor', 'none']);
  const size = Math.max(80, Math.min(128, Math.round(Number(value.size) || 92)));
  return {
    size,
    textMode: textModes.has(value.textMode) ? value.textMode : 'auto',
    ringMode: ringModes.has(value.ringMode) ? value.ringMode : 'auto',
  };
}

function applyTheme() {
  applyThemeClass(document.body, currentTheme);
  applyAccentClass(document.body, currentAccentColor);
  document.body.classList.toggle('low-performance-mode', lowPerformanceMode);
  document.documentElement.style.setProperty('--orb-size', `${currentOrbSettings.size}px`);
}

function renderOrb() {
  const textData = getTextData(currentOrbSettings.textMode);
  const ringData = getRingData(currentOrbSettings.ringMode);
  const active = ringData.active;
  const danger = ringData.danger;

  orb.classList.toggle('active', active);
  orb.classList.toggle('danger', danger);
  orb.classList.toggle('is-idle', !active);
  orb.classList.toggle('is-ring-hidden', currentOrbSettings.ringMode === 'none');
  orbRing.style.strokeDashoffset = active ? orbCircumference * (1 - ringData.progress) : orbCircumference;

  orbLabel.textContent = textData.label;
  orbTime.textContent = textData.value;
  orbStatus.textContent = textData.status;
}

function getTextData(mode) {
  if (mode === 'auto') return getAutoTextData();
  const connected = Boolean(currentGame.connected);
  const health = finiteNumber(currentGame.health);
  const armor = finiteNumber(currentGame.armor);
  const roundTime = finiteNumber(currentGame.phaseEndsIn);
  const bombRemaining = Math.max(0, currentBomb.remainingMs ?? defaultBombDurationMs);

  const modes = {
    status: { label: '信号', value: connected ? '已连' : '--', status: connected ? 'GSI 正常' : '等待 GSI' },
    fps: { label: 'FPS', value: '--', status: '暂不可读' },
    health: { label: '血量', value: health == null ? '--' : String(Math.round(health)), status: connected ? '玩家状态' : '等待信号' },
    armor: { label: '护甲', value: armor == null ? '--' : String(Math.round(armor)), status: connected ? '玩家状态' : '等待信号' },
    roundKills: { label: '击杀', value: String(Math.max(0, Math.round(finiteNumber(currentGame.roundKills) ?? 0))), status: '本回合' },
    roundTime: { label: '回合', value: roundTime == null ? '--' : `${Math.ceil(roundTime)}s`, status: getPhaseLabel(currentGame.phase) },
    bombTime: { label: 'C4', value: currentBomb.active ? `${Math.ceil(bombRemaining / 1000)}s` : '--', status: currentBomb.active ? '剩余时间' : '未安装' },
    c4: { label: 'C4', value: currentBomb.active ? '已装' : '--', status: currentBomb.active ? '正在倒计时' : '无 C4' },
    map: { label: '地图', value: shortenMapName(currentGame.mapName), status: connected ? getPhaseLabel(currentGame.phase) : '等待信号' },
  };
  return modes[mode] || getAutoTextData();
}

function getAutoTextData() {
  const remaining = Math.max(0, currentBomb.remainingMs ?? defaultBombDurationMs);
  const active = Boolean(currentBomb.active);
  const connected = Boolean(currentGame.connected);
  const danger = Boolean(currentBomb.danger);

  if (!active) {
    return {
      label: connected ? '工具' : '信号',
      value: connected ? '待命' : '--',
      status: connected ? '无计时任务' : '等待信号',
    };
  }

  return {
    label: 'C4',
    value: currentBomb.isCt ? (remaining / 1000).toFixed(1) : String(Math.ceil(remaining / 1000)),
    status: currentBomb.isCt ? (danger ? '时间紧迫' : '正在提醒') : '倒计时',
  };
}

function getRingData(mode) {
  if (mode === 'none') return { active: false, progress: 0, danger: false };
  if (mode === 'auto') {
    const active = Boolean(currentBomb.active);
    return {
      active,
      progress: clamp01(currentBomb.progress ?? 1),
      danger: Boolean(currentBomb.danger),
    };
  }
  if (mode === 'bombTime') {
    const active = Boolean(currentBomb.active);
    return {
      active,
      progress: active ? clamp01(currentBomb.progress ?? 1) : 0,
      danger: Boolean(currentBomb.danger),
    };
  }
  if (mode === 'roundTime') {
    const seconds = finiteNumber(currentGame.phaseEndsIn);
    const total = currentGame.phase === 'freezetime' ? 20 : 115;
    return {
      active: seconds != null,
      progress: seconds == null ? 0 : clamp01(seconds / total),
      danger: seconds != null && seconds <= 10,
    };
  }
  if (mode === 'health') {
    const health = finiteNumber(currentGame.health);
    return {
      active: health != null,
      progress: health == null ? 0 : clamp01(health / 100),
      danger: health != null && health <= 25,
    };
  }
  if (mode === 'armor') {
    const armor = finiteNumber(currentGame.armor);
    return {
      active: armor != null,
      progress: armor == null ? 0 : clamp01(armor / 100),
      danger: false,
    };
  }
  return { active: false, progress: 0, danger: false };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function getPhaseLabel(phase) {
  const labels = {
    freezetime: '购买阶段',
    live: '回合中',
    bomb: 'C4 阶段',
    over: '回合结束',
    waiting: '等待信号',
  };
  return labels[phase] || phase || '未知阶段';
}

function shortenMapName(name) {
  const value = String(name || '').replace(/^de_/, '');
  if (!value) return '--';
  return value.length > 6 ? value.slice(0, 6) : value;
}
