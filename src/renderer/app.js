// 主窗口渲染模块负责状态同步、界面交互和用户反馈。
const { escapeHtml, applyThemeClass, applyAccentClass } = window.cs2Ui;
const defaultBombDurationSec = 38;
const monitorOverlayItems = [
  { id: 'fps', label: '游戏 FPS' },
  { id: 'cpuUsage', label: 'CPU 占用' },
  { id: 'gpuUsage', label: 'GPU 占用' },
  { id: 'gpuTemp', label: 'GPU 温度' },
  { id: 'cpuTemp', label: 'CPU 温度' },
  { id: 'vram', label: '显存状态' },
  { id: 'gpuPower', label: '显卡功耗' },
  { id: 'gpuVoltage', label: '显卡电压' },
];
const monitorOverlayDefaultItems = ['cpuUsage', 'gpuUsage', 'gpuTemp', 'vram'];
const monitorOverlayColors = [
  { id: 'green', label: '绿色' },
  { id: 'blue', label: '蓝色' },
  { id: 'amber', label: '金色' },
  { id: 'white', label: '白色' },
  { id: 'red', label: '红色' },
];
const accentColorOptions = [
  { id: 'green', label: '绿色', swatch: '#24c58c' },
  { id: 'blue', label: '蓝色', swatch: '#3b82f6' },
  { id: 'amber', label: '金色', swatch: '#d99a21' },
  { id: 'red', label: '红色', swatch: '#ef4444' },
  { id: 'violet', label: '紫色', swatch: '#8b5cf6' },
];
const backgroundModeLabels = {
  none: '无背景',
  official: '官方预设',
  custom: '自定义图片',
};
const backgroundBrightnessLabels = {
  60: '压暗',
  72: '偏暗',
  82: '标准',
  96: '明亮',
  110: '更亮',
};
const backgroundBlurLabels = {
  0: '清晰',
  4: '轻微',
  8: '柔和',
  14: '明显',
  20: '很模糊',
};
const backgroundPanelOpacityLabels = {
  100: '不透明',
  94: '轻微透出',
  92: '平衡',
  88: '标准透出',
  78: '明显透出',
  68: '高透明',
};
const monitorOverlayOpacityOptions = [
  { id: '0.62', label: '清透' },
  { id: '0.78', label: '半透明' },
  { id: '0.86', label: '标准' },
  { id: '0.96', label: '清晰' },
];
const orbSizeOptions = [
  { id: '80', label: '小号 80px' },
  { id: '92', label: '标准 92px' },
  { id: '104', label: '清晰 104px' },
  { id: '116', label: '大号 116px' },
  { id: '128', label: '醒目 128px' },
];
const orbTextModeOptions = [
  { id: 'auto', label: '自动提醒' },
  { id: 'status', label: '连接状态' },
  { id: 'fps', label: '游戏 FPS' },
  { id: 'health', label: '血量' },
  { id: 'armor', label: '护甲' },
  { id: 'roundKills', label: '本回合击杀' },
  { id: 'roundTime', label: '本回合剩余时间' },
  { id: 'bombTime', label: 'C4 剩余时间' },
  { id: 'c4', label: 'C4 状态' },
  { id: 'map', label: '地图' },
];
const orbRingModeOptions = [
  { id: 'auto', label: '自动提醒' },
  { id: 'bombTime', label: 'C4 剩余时间' },
  { id: 'roundTime', label: '本回合剩余时间' },
  { id: 'health', label: '血量' },
  { id: 'armor', label: '护甲' },
  { id: 'none', label: '关闭圆环' },
];
const eventSoundFilterOptions = [
  { id: 'common', label: '常用' },
  { id: 'round', label: '回合 / 地图' },
  { id: 'weapon', label: '武器' },
  { id: 'grenade', label: '投掷物' },
  { id: 'effect', label: '受击状态' },
  { id: 'player', label: '玩家状态' },
  { id: 'bomb', label: '炸弹 / 计时' },
  { id: 'all', label: '全部' },
];
const onboardingSlides = [
  {
    kicker: '欢迎使用',
    title: 'CS2工具盒子',
    text: '连接 CS2，确认工具状态，自动执行你设置好的玩法。',
  },
  {
    kicker: '实用功能 / 有趣玩法',
    title: '游戏小窗提醒，热身期间看道具点位',
    text: '更多玩法在“自动功能”里，点一下就能添加。',
  },
  {
    kicker: '一键连接',
    title: '先让工具连上 CS2',
    text: '一键写入官方允许的状态配置。写入后重启 CS2，进图就能收到信号。',
    action: 'cfg',
  },
  {
    kicker: '自动功能',
    title: '当状态变化，就执行动作',
    text: '常用玩法直接添加官方预设；想折腾时，再打开手动规则。',
  },
  {
    kicker: '开发说明',
    title: '测试版，持续更新',
    text: '这是仍在打磨的测试版工具，后续会继续修 bug、补玩法、优化界面。遇到问题或有好玩的预设想法，可以通过 QQ 反馈。',
    media: 'qq',
  },
];
let state = {
  settings: {
    enabled: true,
    theme: 'light',
    accentColor: 'green',
    background: { mode: 'none', presetId: 'cs2-classic', brightness: 82, blur: 0, panelOpacity: 92, presets: [] },
    bombDurationSec: defaultBombDurationSec,
    orb: { visible: true, size: 92, textMode: 'auto', ringMode: 'auto' },
    monitorOverlay: { visible: false, color: 'green', opacity: 0.86, compact: false, items: monitorOverlayDefaultItems },
    audio: { killSoundVolume: 100, duckCs2OnKill: false },
    onboarding: { completed: false },
  },
  game: {},
  bomb: { active: false, remainingMs: defaultBombDurationSec * 1000, progress: 1, danger: false },
  server: { running: false, port: 31982 },
  runtime: { gameRunning: false, gameProcess: 'cs2.exe', checkedAt: null, error: null },
  cfgStatus: { installed: false, valid: false, path: '', message: '尚未完成游戏配置' },
  custom: { enabled: true, catalog: [], values: {}, rules: [], presets: [] },
  toolbox: { demos: { dir: '', demos: [], message: '' }, proProfiles: [], fontOptions: [], introOptions: [], latencyTargets: [] },
  onlineData: { sponsors: [], notices: [], seenNoticeIds: [], fetchedAt: null, error: '' },
  diagnostics: null,
  selfCheck: null,
  stats: null,
};
let currentCustomRuleId = null;
let currentCustomDialogMode = 'idle';
let onboardingStep = 0;
let onboardingAnimating = false;
let monitorTimer = null;
let confirmResolver = null;
let donationPromptChecked = false;
let onlineDataChecked = false;
let onlineNoticeQueue = [];
let activeOnlineNotice = null;
let panelTransitionTimer = null;
let cursorGlowFrame = 0;
let cursorGlowX = -999;
let cursorGlowY = -999;
let customSelectMenu = null;
let activeCustomSelect = null;
let customSelectObserver = null;
let customSelectSyncFrame = 0;
const soundPoolSize = 3;
const soundPools = new Map();
const soundBuffers = new Map();
const soundBufferPromises = new Map();
let audioContext = null;
let lastSoundErrorAt = 0;

const $ = selector => document.querySelector(selector);

const elements = {
  body: document.body,
  themeWave: $('#themeWave'),
  cursorGlow: $('#cursorGlow'),
  navIndicator: $('#navIndicator'),
  onboardingScreen: $('#onboardingScreen'),
  onboardingKicker: $('#onboardingKicker'),
  onboardingTitle: $('#onboardingTitle'),
  onboardingText: $('#onboardingText'),
  onboardingMedia: $('#onboardingMedia'),
  onboardingCfgButton: $('#onboardingCfgButton'),
  onboardingNextButton: $('#onboardingNextButton'),
  onboardingDots: $('#onboardingDots'),
  masterEnabled: $('#masterEnabled'),
  masterEnabledText: $('#masterEnabledText'),
  toggleOrbButton: $('#toggleOrbButton'),
  themeToggle: $('#themeToggle'),
  accentColorPicker: $('#accentColorPicker'),
  backgroundModeSelect: $('#backgroundModeSelect'),
  backgroundPresetSelect: $('#backgroundPresetSelect'),
  backgroundBrightnessSelect: $('#backgroundBrightnessSelect'),
  backgroundBlurSelect: $('#backgroundBlurSelect'),
  backgroundPanelOpacitySelect: $('#backgroundPanelOpacitySelect'),
  backgroundSummary: $('#backgroundSummary'),
  backgroundPreview: $('#backgroundPreview'),
  chooseBackgroundButton: $('#chooseBackgroundButton'),
  applyBackgroundButton: $('#applyBackgroundButton'),
  orbVisible: $('#orbVisible'),
  settingsFilter: $('.settings-filter'),
  settingsPage: $('[data-settings-page]'),
  settingsEnabled: $('#settingsEnabled'),
  bombDurationSelect: $('#bombDurationSelect'),
  lowPerformanceMode: $('#lowPerformanceMode'),
  killSoundVolumeSelect: $('#killSoundVolumeSelect'),
  duckCs2Audio: $('#duckCs2Audio'),
  launchAtStartup: $('#launchAtStartup'),
  homeVerdictBadge: $('#homeVerdictBadge'),
  homeVerdictTitle: $('#homeVerdictTitle'),
  homeVerdictHint: $('#homeVerdictHint'),
  homeReadyLabel: $('#homeReadyLabel'),
  homeReadyValue: $('#homeReadyValue'),
  healthCfg: $('#healthCfg'),
  healthGame: $('#healthGame'),
  healthGsi: $('#healthGsi'),
  healthReady: $('#healthReady'),
  homeCfgState: $('#homeCfgState'),
  homeCfgDetail: $('#homeCfgDetail'),
  homeCfgPath: $('#homeCfgPath'),
  homeGameState: $('#homeGameState'),
  homeGameDetail: $('#homeGameDetail'),
  homeGameTime: $('#homeGameTime'),
  homeGsiState: $('#homeGsiState'),
  homeGsiDetail: $('#homeGsiDetail'),
  homeGsiTime: $('#homeGsiTime'),
  homeUsableState: $('#homeUsableState'),
  homeUsableDetail: $('#homeUsableDetail'),
  homeUsableMeta: $('#homeUsableMeta'),
  homeNextTitle: $('#homeNextTitle'),
  homeNextDetail: $('#homeNextDetail'),
  homeNextButton: $('#homeNextButton'),
  selfCheckButton: $('#selfCheckButton'),
  selfCheckList: $('#selfCheckList'),
  homeRulesText: $('#homeRulesText'),
  homeOrbText: $('#homeOrbText'),
  homeServerText: $('#homeServerText'),
  serverDot: $('#serverDot'),
  serverText: $('#serverText'),
  cfgHint: $('#cfgHint'),
  cfgPathText: $('#cfgPathText'),
  cfgStatusText: $('#cfgStatusText'),
  cfgStatusBadge: $('#cfgStatusBadge'),
  serverDetailText: $('#serverDetailText'),
  customEnabled: $('#customEnabled'),
  customEnabledText: $('#customEnabledText'),
  customSummaryText: $('#customSummaryText'),
  customAddButton: $('#customAddButton'),
  customManualButton: $('#customManualButton'),
  customList: $('#customList'),
  refreshDiagnosticsButton: $('#refreshDiagnosticsButton'),
  copyDiagnosticsButton: $('#copyDiagnosticsButton'),
  diagnosticsSummaryText: $('#diagnosticsSummaryText'),
  diagnosticsBadge: $('#diagnosticsBadge'),
  diagnosticsCheckList: $('#diagnosticsCheckList'),
  diagnosticLogList: $('#diagnosticLogList'),
  diagnosticText: $('#diagnosticText'),
  customDialog: $('#customDialog'),
  customDialogTitle: $('#customDialogTitle'),
  customDialogSubtitle: $('#customDialogSubtitle'),
  customDialogBody: $('#customDialogBody'),
  customDialogSave: $('#customDialogSave'),
  customDialogTest: $('#customDialogTest'),
  confirmDialog: $('#confirmDialog'),
  confirmTitle: $('#confirmTitle'),
  confirmMessage: $('#confirmMessage'),
  confirmCancelButton: $('#confirmCancelButton'),
  confirmOkButton: $('#confirmOkButton'),
  closeChoiceDialog: $('#closeChoiceDialog'),
  closeQuitButton: $('#closeQuitButton'),
  closeMinimizeButton: $('#closeMinimizeButton'),
  donationDialog: $('#donationDialog'),
  donationLaterButton: $('#donationLaterButton'),
  donationAboutButton: $('#donationAboutButton'),
  setupGuideDialog: $('#setupGuideDialog'),
  setupGuideDoneButton: $('#setupGuideDoneButton'),
  setupGuideStatusButton: $('#setupGuideStatusButton'),
  replayOnboardingButton: $('#replayOnboardingButton'),
  monitorEnabled: $('#monitorEnabled'),
  monitorGrid: $('#monitorGrid'),
  monitorHint: $('#monitorHint'),
  monitorOverlayVisible: $('#monitorOverlayVisible'),
  monitorOverlayResetButton: $('#monitorOverlayResetButton'),
  monitorOverlayColor: $('#monitorOverlayColor'),
  monitorOverlayOpacity: $('#monitorOverlayOpacity'),
  monitorOverlayCompact: $('#monitorOverlayCompact'),
  monitorOverlayItems: $('#monitorOverlayItems'),
  monitorOverlaySummary: $('#monitorOverlaySummary'),
  orbPanelVisible: $('#orbPanelVisible'),
  orbSizeSelect: $('#orbSizeSelect'),
  orbTextModeSelect: $('#orbTextModeSelect'),
  orbRingModeSelect: $('#orbRingModeSelect'),
  orbPanelResetButton: $('#orbPanelResetButton'),
  orbPreview: $('#orbPreview'),
  orbPreviewRing: $('#orbPreviewRing'),
  orbPreviewLabel: $('#orbPreviewLabel'),
  orbPreviewValue: $('#orbPreviewValue'),
  orbPreviewStatus: $('#orbPreviewStatus'),
  orbTextModeSummary: $('#orbTextModeSummary'),
  orbRingModeSummary: $('#orbRingModeSummary'),
  sponsorStatus: $('#sponsorStatus'),
  sponsorList: $('#sponsorList'),
  refreshSponsorsButton: $('#refreshSponsorsButton'),
  onlineNoticeDialog: $('#onlineNoticeDialog'),
  onlineNoticeType: $('#onlineNoticeType'),
  onlineNoticeTitle: $('#onlineNoticeTitle'),
  onlineNoticeMessage: $('#onlineNoticeMessage'),
  onlineNoticeDetail: $('#onlineNoticeDetail'),
  onlineNoticeCloseButton: $('#onlineNoticeCloseButton'),
  onlineNoticeOkButton: $('#onlineNoticeOkButton'),
  toastStack: $('#toastStack'),
};

window.addEventListener('DOMContentLoaded', initializeRenderer);

async function initializeRenderer() {
  const warmupPromise = warmUpAnimations().catch(error => console.debug('动画预热失败:', error));
  const loadingFallback = setTimeout(() => document.body.classList.remove('is-loading'), 1600);
  bindEvents();
  initCustomSelects();
  primeAudioEngine();
  try {
    const initial = await window.cs2Assistant.getState();
    mergeState(initial);
    const soundWarmupPromise = preloadCustomSounds(state.custom);
    render();
    refreshOnlineData(true);
    await Promise.allSettled([warmupPromise, soundWarmupPromise]);
    clearTimeout(loadingFallback);
    document.body.classList.remove('is-loading');
  } catch (error) {
    clearTimeout(loadingFallback);
    document.body.classList.remove('is-loading');
    console.error('初始化失败:', error);
  }
}

window.cs2Assistant.onInit(payload => {
  mergeState(payload);
  render();
});
window.cs2Assistant.onSettings(settings => {
  state.settings = settings;
  applyTheme(settings.theme);
  applyAccentColor(settings.accentColor);
  applyBackgroundSettings();
  renderSettings();
});
window.cs2Assistant.onGame(game => {
  state.game = game;
  renderGame();
  maybeShowDonationPrompt();
});
window.cs2Assistant.onBomb(bomb => {
  state.bomb = bomb;
  renderBomb();
});
window.cs2Assistant.onServer(server => {
  state.server = server;
  renderServer();
});
window.cs2Assistant.onRuntime(runtime => {
  state.runtime = { ...state.runtime, ...runtime };
  renderOverviewStatus();
});
window.cs2Assistant.onCustom(custom => {
  state.custom = { ...state.custom, ...custom };
  preloadCustomSounds(state.custom);
  const nextCount = (state.custom.rules || []).length;
  if (elements.customList.childElementCount === 0 || elements.customList.dataset.ruleCount !== String(nextCount)) {
    renderCustomPanel();
  } else {
    renderCustomValues();
  }
  renderDiagnosticsPanel();
});
window.cs2Assistant.onPlaySound(payload => {
  playSoundFile(payload.filePath, { isKillSound: Boolean(payload.isKillSound) });
});

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = new AudioContextCtor({ latencyHint: 'interactive' });
  return audioContext;
}

function primeAudioEngine() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
}

function nextAnimationFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

async function warmUpAnimations() {
  preloadStaticImages();

  const warmup = document.createElement('div');
  warmup.className = 'animation-warmup';
  warmup.setAttribute('aria-hidden', 'true');
  warmup.innerHTML = `
    <div class="theme-wave"></div>
    <div class="launch-mark"><span class="launch-mark__ring"></span></div>
    <article class="onboarding-simple">
      <span>预热</span>
      <h1>动画预热</h1>
      <p>启动期间预先准备动画。</p>
      <div class="onboarding-dots"><span class="is-active"></span><span></span></div>
    </article>
    <section class="panel-page is-active"></section>
    <article class="rule-card" style="--i: 0"><div class="rule-card__main"><div class="rule-card__title"><strong>预热</strong></div></div></article>
    <button class="preset-card" style="--i: 1" type="button"><strong>预热</strong><span>预热</span></button>
    <dialog class="custom-dialog" open><form method="dialog" class="custom-dialog__panel"></form></dialog>
    <article class="toast toast--success">
      <div class="toast__icon">✓</div>
      <div class="toast__body"><strong>预热</strong><p>预热</p></div>
      <button class="toast__close" aria-label="关闭通知">×</button>
    </article>
    <span class="status-dot danger"></span>
  `;
  document.body.appendChild(warmup);

  const toast = warmup.querySelector('.toast');
  const onboarding = warmup.querySelector('.onboarding-simple');
  const themeWave = warmup.querySelector('.theme-wave');

  warmup.getBoundingClientRect();
  await nextAnimationFrame();

  toast?.classList.add('is-visible');
  onboarding?.classList.add('is-changing');
  themeWave?.animate(
    [
      { transform: 'scale(0)', opacity: 0.55 },
      { transform: 'scale(2.8)', opacity: 0 },
    ],
    { duration: 24, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
  );

  await nextAnimationFrame();

  toast?.classList.add('is-leaving');
  await nextAnimationFrame();
  warmup.remove();
}

function preloadStaticImages() {
  [
    'assets/cs2tool-icon-light.png',
    'assets/cs2tool-icon-dark.png',
  ].forEach(src => {
    const image = new Image();
    image.src = src;
    if (typeof image.decode === 'function') {
      image.decode().catch(() => {});
    }
  });
}

function bindEvents() {
  $('#minimizeButton').addEventListener('click', () => window.cs2Assistant.minimize());
  $('#closeButton').addEventListener('click', openCloseChoiceDialog);
  $('#onboardingMinimizeButton').addEventListener('click', () => window.cs2Assistant.minimize());
  $('#onboardingCloseButton').addEventListener('click', openCloseChoiceDialog);
  elements.onboardingNextButton.addEventListener('click', nextOnboardingStep);
  elements.onboardingCfgButton.addEventListener('click', autoInstallCfg);
  elements.masterEnabled.addEventListener('change', event => setAppEnabled(event.target.checked));
  elements.settingsEnabled.addEventListener('change', event => setAppEnabled(event.target.checked));
  elements.settingsFilter.addEventListener('click', handleSettingsFilterClick);
  elements.bombDurationSelect.addEventListener('change', event => setBombDurationSec(event.target.value));
  elements.lowPerformanceMode.addEventListener('change', event => setLowPerformanceMode(event.target.checked));
  elements.accentColorPicker.addEventListener('click', event => {
    const button = event.target.closest('[data-accent-color]');
    if (!button || button.disabled) return;
    setAccentColor(button.dataset.accentColor);
  });
  elements.backgroundModeSelect.addEventListener('change', event => updateBackgroundSettings({ mode: event.target.value }));
  elements.backgroundPresetSelect.addEventListener('change', event => updateBackgroundSettings({ mode: 'official', presetId: event.target.value }));
  elements.backgroundBrightnessSelect.addEventListener('change', event => updateBackgroundSettings({ brightness: Number(event.target.value) }));
  elements.backgroundBlurSelect.addEventListener('change', event => updateBackgroundSettings({ blur: Number(event.target.value) }));
  elements.backgroundPanelOpacitySelect.addEventListener('change', event => updateBackgroundSettings({ panelOpacity: Number(event.target.value) }));
  elements.chooseBackgroundButton.addEventListener('click', chooseBackgroundImage);
  elements.applyBackgroundButton.addEventListener('click', applyBackgroundFromControls);
  elements.killSoundVolumeSelect.addEventListener('change', event => setAudioSettings({ killSoundVolume: event.target.value }));
  elements.duckCs2Audio.addEventListener('change', event => setAudioSettings({ duckCs2OnKill: event.target.checked }));
  elements.launchAtStartup.addEventListener('change', event => setStartup(event.target.checked));
  elements.toggleOrbButton.addEventListener('click', toggleOrbFromTitlebar);
  $('#autoInstallButton').addEventListener('click', autoInstallCfg);
  $('#chooseDirButton').addEventListener('click', chooseCfgDir);
  $('#openCfgButton').addEventListener('click', openCfgFolder);
  $('#testGsiButton').addEventListener('click', testGsiPayload);
  $('#resetGsiButton').addEventListener('click', resetGsiState);
  $('#resetOrbButton').addEventListener('click', resetOrbPosition);
  $('#quitButton').addEventListener('click', () => window.cs2Assistant.quit());
  elements.replayOnboardingButton.addEventListener('click', restartOnboarding);
  elements.monitorEnabled.addEventListener('change', event => toggleMonitor(event.target.checked));
  elements.monitorOverlayVisible.addEventListener('change', event => setMonitorOverlayVisible(event.target.checked));
  elements.monitorOverlayResetButton.addEventListener('click', resetMonitorOverlayPosition);
  elements.monitorOverlayColor.addEventListener('change', event => updateMonitorOverlay({ color: event.target.value }));
  elements.monitorOverlayOpacity.addEventListener('change', event => updateMonitorOverlay({ opacity: Number(event.target.value) }));
  elements.monitorOverlayCompact.addEventListener('change', event => updateMonitorOverlay({ compact: event.target.checked }));
  elements.monitorOverlayItems.addEventListener('change', handleMonitorOverlayItemsChange);
  elements.orbPanelVisible.addEventListener('change', event => setOrbVisible(event.target.checked));
  elements.orbSizeSelect.addEventListener('change', event => updateOrbSettings({ size: Number(event.target.value) }));
  elements.orbTextModeSelect.addEventListener('change', event => updateOrbSettings({ textMode: event.target.value }));
  elements.orbRingModeSelect.addEventListener('change', event => updateOrbSettings({ ringMode: event.target.value }));
  elements.orbPanelResetButton.addEventListener('click', resetOrbPosition);
  elements.homeNextButton.addEventListener('click', handleHomeNext);
  elements.selfCheckButton.addEventListener('click', runSelfCheck);
  elements.refreshDiagnosticsButton.addEventListener('click', refreshDiagnostics);
  elements.copyDiagnosticsButton.addEventListener('click', copyDiagnostics);
  elements.refreshSponsorsButton.addEventListener('click', refreshSponsors);
  elements.customAddButton.addEventListener('click', openPresetDialog);
  elements.customManualButton.addEventListener('click', () => openCustomRuleDialog(null));
  elements.customEnabled.addEventListener('change', event => setCustomEnabled(event.target.checked));
  elements.customList.addEventListener('click', handleCustomClick);
  elements.customDialogBody.addEventListener('click', handleCustomDialogClick);
  elements.customDialogBody.addEventListener('change', handleCustomDialogChange);
  elements.customDialogSave.addEventListener('click', saveCustomDialog);
  elements.customDialogTest.addEventListener('click', testCustomDialog);
  elements.customDialog.addEventListener('close', () => {
    closeCustomSelectMenu();
    if (customSelectMenu?.parentElement !== document.body) {
      document.body.appendChild(customSelectMenu);
    }
    currentCustomRuleId = null;
    currentCustomDialogMode = 'idle';
    elements.customDialogSave.hidden = false;
    elements.customDialogTest.hidden = false;
  });
  elements.confirmCancelButton.addEventListener('click', () => resolveConfirm(false));
  elements.confirmOkButton.addEventListener('click', () => resolveConfirm(true));
  elements.confirmDialog.addEventListener('cancel', event => {
    event.preventDefault();
    resolveConfirm(false);
  });
  elements.confirmDialog.addEventListener('close', () => {
    resolveConfirm(false);
  });
  elements.closeQuitButton.addEventListener('click', () => {
    elements.closeChoiceDialog.close();
    window.cs2Assistant.quit();
  });
  elements.closeMinimizeButton.addEventListener('click', () => {
    elements.closeChoiceDialog.close();
    window.cs2Assistant.close();
  });
  elements.closeChoiceDialog.addEventListener('cancel', event => {
    event.preventDefault();
    elements.closeChoiceDialog.close();
  });
  elements.donationLaterButton.addEventListener('click', () => elements.donationDialog.close());
  elements.donationAboutButton.addEventListener('click', () => {
    elements.donationDialog.close();
    switchPanel('sponsorPanel');
  });
  elements.onlineNoticeOkButton.addEventListener('click', acknowledgeOnlineNotice);
  elements.onlineNoticeCloseButton.addEventListener('click', acknowledgeOnlineNotice);
  elements.onlineNoticeDialog.addEventListener('cancel', event => {
    event.preventDefault();
    acknowledgeOnlineNotice();
  });
  elements.setupGuideDoneButton.addEventListener('click', completeSetupGuide);
  elements.setupGuideStatusButton.addEventListener('click', async () => {
    await completeSetupGuide();
    switchPanel('overviewPanel');
  });
  elements.themeToggle.addEventListener('click', event => toggleTheme(event));
  elements.orbVisible.addEventListener('change', event => setOrbVisible(event.target.checked));
  window.addEventListener('pointermove', moveCursorGlow);
  window.addEventListener('pointerdown', primeAudioEngine, { once: true });
  window.addEventListener('keydown', primeAudioEngine, { once: true });
  window.addEventListener('resize', () => {
    closeCustomSelectMenu();
    updateNavIndicator();
  });
  document.documentElement.addEventListener('pointerleave', hideCursorGlow);
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleDocumentKeydown);

  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => switchPanel(button.dataset.target));
  });
  requestAnimationFrame(updateNavIndicator);
}

function updateNavIndicator() {
  if (!elements.navIndicator) return;
  const activeItem = document.querySelector('.nav-item.is-active');
  const sidebar = activeItem?.closest('.sidebar');
  if (!activeItem || !sidebar) return;
  const sidebarRect = sidebar.getBoundingClientRect();
  const itemRect = activeItem.getBoundingClientRect();
  const top = itemRect.top - sidebarRect.top + 9;
  const height = Math.max(16, itemRect.height - 18);
  elements.navIndicator.style.transform = `translate3d(0, ${top}px, 0)`;
  elements.navIndicator.style.height = `${height}px`;
}

function moveCursorGlow(event) {
  if (state.settings.lowPerformanceMode) return;
  cursorGlowX = event.clientX - 80;
  cursorGlowY = event.clientY - 80;
  if (!elements.body.classList.contains('has-cursor-glow')) {
    elements.body.classList.add('has-cursor-glow');
  }
  if (cursorGlowFrame) return;
  cursorGlowFrame = requestAnimationFrame(() => {
    elements.cursorGlow.style.transform = `translate3d(${cursorGlowX}px, ${cursorGlowY}px, 0)`;
    cursorGlowFrame = 0;
  });
}

function hideCursorGlow() {
  elements.body.classList.remove('has-cursor-glow');
  if (cursorGlowFrame) {
    cancelAnimationFrame(cursorGlowFrame);
    cursorGlowFrame = 0;
  }
}

function initCustomSelects() {
  customSelectMenu = document.createElement('div');
  customSelectMenu.className = 'custom-select-menu';
  customSelectMenu.hidden = true;
  customSelectMenu.setAttribute('role', 'listbox');
  document.body.appendChild(customSelectMenu);

  enhanceSelects(document);
  customSelectObserver = new MutationObserver(records => {
    const shouldSync = records.some(record => {
      if (record.type === 'attributes' && record.target?.matches?.('select')) return true;
      return [...record.addedNodes].some(node => (
        node.nodeType === Node.ELEMENT_NODE
        && (node.matches?.('select') || node.querySelector?.('select'))
      ));
    });
    if (shouldSync) scheduleCustomSelectSync();
  });
  customSelectObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'hidden', 'class', 'value'],
  });
}

function scheduleCustomSelectSync() {
  if (customSelectSyncFrame) return;
  customSelectSyncFrame = requestAnimationFrame(() => {
    customSelectSyncFrame = 0;
    enhanceSelects(document);
    syncCustomSelects();
  });
}

function enhanceSelects(root) {
  root.querySelectorAll('select').forEach(select => {
    if (select.dataset.nativeSelect === 'true') return;
    if (!select.dataset.customSelectId) {
      select.dataset.customSelectId = `custom-select-${Math.random().toString(36).slice(2)}`;
    }

    let shell = select.closest('.custom-select-shell');
    if (!shell) {
      shell = document.createElement('span');
      shell.className = 'custom-select-shell';
      select.parentNode.insertBefore(shell, select);
      shell.appendChild(select);
    }

    select.classList.add('native-select-hidden');
    select.tabIndex = -1;
    let button = shell.querySelector(':scope > .custom-select-button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'custom-select-button';
      button.setAttribute('aria-haspopup', 'listbox');
      button.innerHTML = '<span></span><i aria-hidden="true"></i>';
      shell.appendChild(button);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        toggleCustomSelect(select);
      });
    }

    if (!select.dataset.customSelectBound) {
      select.dataset.customSelectBound = 'true';
      select.addEventListener('change', () => syncCustomSelect(select));
    }

    syncCustomSelect(select);
  });
}

function syncCustomSelects() {
  document.querySelectorAll('select[data-custom-select-id]').forEach(syncCustomSelect);
}

function syncCustomSelect(select) {
  const shell = select.closest('.custom-select-shell');
  const button = shell?.querySelector(':scope > .custom-select-button');
  if (!button) return;
  const selectedOption = select.selectedOptions?.[0] || select.options?.[select.selectedIndex];
  button.querySelector('span').textContent = selectedOption?.textContent?.trim() || '请选择';
  button.disabled = select.disabled;
  button.setAttribute('aria-expanded', activeCustomSelect === select ? 'true' : 'false');
  button.setAttribute('aria-disabled', select.disabled ? 'true' : 'false');
  shell.classList.toggle('is-disabled', select.disabled);
}

function toggleCustomSelect(select) {
  if (select.disabled) return;
  if (activeCustomSelect === select && !customSelectMenu.hidden) {
    closeCustomSelectMenu();
    return;
  }
  openCustomSelectMenu(select);
}

function openCustomSelectMenu(select) {
  activeCustomSelect = select;
  const button = select.closest('.custom-select-shell')?.querySelector(':scope > .custom-select-button');
  if (!button) return;
  const menuHost = select.closest('dialog[open]') || document.body;
  if (customSelectMenu.parentElement !== menuHost) {
    menuHost.appendChild(customSelectMenu);
  }
  const options = [...select.options];
  customSelectMenu.innerHTML = options.map((option, index) => `
    <button
      type="button"
      class="custom-select-option${option.selected ? ' is-selected' : ''}"
      data-select-index="${index}"
      role="option"
      aria-selected="${option.selected ? 'true' : 'false'}"
      ${option.disabled ? 'disabled' : ''}
    >${escapeHtml(option.textContent || '')}</button>
  `).join('');

  customSelectMenu.querySelectorAll('.custom-select-option').forEach(optionButton => {
    optionButton.addEventListener('click', () => chooseCustomSelectOption(Number(optionButton.dataset.selectIndex)));
  });

  const rect = button.getBoundingClientRect();
  const hostRect = menuHost === document.body
    ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
    : menuHost.getBoundingClientRect();
  const menuWidth = Math.max(rect.width, 168);
  const viewportGap = 10;
  const estimatedHeight = Math.min(280, Math.max(36, options.length * 34 + 8));
  const openUp = rect.bottom + estimatedHeight + viewportGap > hostRect.bottom && rect.top - hostRect.top > estimatedHeight;
  const top = openUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
  const minLeft = hostRect.left + viewportGap;
  const maxLeft = hostRect.right - menuWidth - viewportGap;
  const left = Math.min(maxLeft, Math.max(minLeft, rect.left));

  customSelectMenu.style.width = `${menuWidth}px`;
  customSelectMenu.style.left = `${left - hostRect.left}px`;
  customSelectMenu.style.top = `${Math.max(hostRect.top + viewportGap, top) - hostRect.top}px`;
  customSelectMenu.hidden = false;
  requestAnimationFrame(() => customSelectMenu.classList.add('is-open'));
  syncCustomSelect(select);
}

function chooseCustomSelectOption(index) {
  if (!activeCustomSelect || !activeCustomSelect.options[index]) return;
  const select = activeCustomSelect;
  select.selectedIndex = index;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  syncCustomSelect(select);
  closeCustomSelectMenu();
}

function closeCustomSelectMenu() {
  if (!customSelectMenu || customSelectMenu.hidden) return;
  const previousSelect = activeCustomSelect;
  activeCustomSelect = null;
  customSelectMenu.classList.remove('is-open');
  customSelectMenu.hidden = true;
  customSelectMenu.innerHTML = '';
  if (previousSelect) syncCustomSelect(previousSelect);
}

function handleDocumentPointerDown(event) {
  if (!customSelectMenu || customSelectMenu.hidden) return;
  const shell = activeCustomSelect?.closest('.custom-select-shell');
  if (customSelectMenu.contains(event.target) || shell?.contains(event.target)) return;
  closeCustomSelectMenu();
}

function handleDocumentKeydown(event) {
  if (!activeCustomSelect || customSelectMenu?.hidden) return;
  const options = [...activeCustomSelect.options];
  const currentIndex = Math.max(0, activeCustomSelect.selectedIndex);
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCustomSelectMenu();
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    let nextIndex = currentIndex;
    for (let i = 0; i < options.length; i += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex].disabled) break;
    }
    activeCustomSelect.selectedIndex = nextIndex;
    activeCustomSelect.dispatchEvent(new Event('change', { bubbles: true }));
    openCustomSelectMenu(activeCustomSelect);
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    closeCustomSelectMenu();
  }
}

function openCloseChoiceDialog() {
  if (elements.closeChoiceDialog.open) return;
  if (elements.donationDialog.open) elements.donationDialog.close();
  elements.closeChoiceDialog.showModal();
  elements.closeMinimizeButton.focus();
}

function switchPanel(targetId) {
  const navItems = [...document.querySelectorAll('.nav-item')];
  const panels = [...document.querySelectorAll('.panel-page')];
  const nextPanel = panels.find(panel => panel.id === targetId);
  const currentPanel = panels.find(panel => panel.classList.contains('is-active') && !panel.classList.contains('is-leaving'))
    || panels.find(panel => panel.classList.contains('is-active'));
  if (!nextPanel || currentPanel === nextPanel) return;

  const currentIndex = navItems.findIndex(item => item.dataset.target === currentPanel?.id);
  const nextIndex = navItems.findIndex(item => item.dataset.target === targetId);
  const direction = currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex ? 'back' : 'forward';
  const animationsDisabled = Boolean(state.settings.lowPerformanceMode);

  navItems.forEach(item => {
    item.classList.toggle('is-active', item.dataset.target === targetId);
  });
  updateNavIndicator();

  window.clearTimeout(panelTransitionTimer);
  panels.forEach(panel => {
    panel.classList.remove('is-entering', 'is-leaving', 'is-forward', 'is-back');
    if (panel !== currentPanel) panel.classList.remove('is-active');
  });

  if (animationsDisabled || !currentPanel) {
    panels.forEach(panel => panel.classList.toggle('is-active', panel === nextPanel));
    nextPanel.scrollTop = 0;
  } else {
    currentPanel.classList.add('is-leaving', direction === 'forward' ? 'is-forward' : 'is-back');
    nextPanel.classList.add('is-active', 'is-entering', direction === 'forward' ? 'is-forward' : 'is-back');
    nextPanel.scrollTop = 0;
    panelTransitionTimer = window.setTimeout(() => {
      currentPanel.classList.remove('is-active', 'is-leaving', 'is-forward', 'is-back');
      nextPanel.classList.remove('is-entering', 'is-forward', 'is-back');
    }, 260);
  }

  if (targetId === 'diagnosticsPanel' && !state.diagnostics) {
    refreshDiagnostics();
  }
}

function mergeState(next) {
  state = {
    ...state,
    ...next,
    settings: {
      ...state.settings,
      ...(next?.settings || {}),
      onboarding: { ...state.settings.onboarding, ...(next?.settings?.onboarding || {}) },
    },
    game: { ...state.game, ...(next?.game || {}) },
    bomb: { ...state.bomb, ...(next?.bomb || {}) },
    server: { ...state.server, ...(next?.server || {}) },
    runtime: { ...state.runtime, ...(next?.runtime || {}) },
    cfgStatus: { ...state.cfgStatus, ...(next?.cfgStatus || {}) },
    custom: { ...state.custom, ...(next?.custom || {}) },
    toolbox: { ...state.toolbox, ...(next?.toolbox || {}) },
    onlineData: { ...state.onlineData, ...(next?.onlineData || {}) },
    diagnostics: next?.diagnostics || state.diagnostics,
    selfCheck: next?.selfCheck || state.selfCheck,
  };
  preloadCustomSounds(state.custom);
}

function render() {
  applyTheme(state.settings.theme);
  applyAccentColor(state.settings.accentColor);
  applyBackgroundSettings();
  applyPerformanceMode();
  renderOnboarding();
  renderSettings();
  renderServer();
  renderGame();
  renderBomb();
  renderMonitor(null);
  renderCustomPanel();
  renderSelfCheck();
  renderDiagnosticsPanel();
  renderSponsorPanel();
  renderOverviewStatus();
  maybeShowDonationPrompt();
  requestAnimationFrame(updateNavIndicator);
}

function renderSponsorPanel() {
  const sponsors = Array.isArray(state.onlineData?.sponsors) ? state.onlineData.sponsors : [];
  const error = state.onlineData?.error;
  const fetchedAt = state.onlineData?.fetchedAt ? new Date(state.onlineData.fetchedAt) : null;
  if (elements.sponsorStatus) {
    if (sponsors.length) {
      elements.sponsorStatus.textContent = `已展示 ${sponsors.length} 位赞助者`;
    } else if (error) {
      elements.sponsorStatus.textContent = '线上名单暂时不可用';
    } else if (fetchedAt) {
      elements.sponsorStatus.textContent = '暂无公开赞助记录';
    } else {
      elements.sponsorStatus.textContent = '正在读取线上名单';
    }
  }
  if (!elements.sponsorList) return;
  if (!sponsors.length) {
    elements.sponsorList.innerHTML = `
      <div class="sponsor-empty">
        <strong>${error ? '暂时没有读取到线上名单' : '还没有添加赞助人'}</strong>
        <span>${error ? '网络不可用时会继续使用上一次成功读取的缓存。' : '名单确认后，会在线上数据仓库里更新。'}</span>
      </div>
    `;
    return;
  }
  elements.sponsorList.innerHTML = sponsors.map(item => `
    <article class="sponsor-item">
      <strong>${escapeHtml(item.name)}</strong>
      ${item.message ? `<span>${escapeHtml(item.message)}</span>` : '<span>感谢支持 CS2工具盒子。</span>'}
    </article>
  `).join('');
}

async function refreshOnlineData(force = false) {
  if (onlineDataChecked && !force) return true;
  onlineDataChecked = true;
  try {
    const onlineData = await window.cs2Assistant.getOnlineData(force);
    state.onlineData = { ...state.onlineData, ...(onlineData || {}) };
    renderSponsorPanel();
    showOnlineNotices();
    return true;
  } catch (error) {
    state.onlineData = { ...state.onlineData, error: error.message || '线上数据读取失败' };
    renderSponsorPanel();
    return false;
  }
}

async function refreshSponsors() {
  setButtonBusy(elements.refreshSponsorsButton, '刷新中');
  if (elements.sponsorStatus) elements.sponsorStatus.textContent = '正在刷新线上名单';
  try {
    const ok = await refreshOnlineData(true);
    if (!ok) throw new Error(state.onlineData?.error || '线上数据读取失败');
    const count = Array.isArray(state.onlineData?.sponsors) ? state.onlineData.sponsors.length : 0;
    showToast({
      type: 'success',
      title: '名单已刷新',
      message: count ? `当前展示 ${count} 位赞助者。` : '已读取线上名单，目前还没有公开赞助记录。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '刷新失败',
      message: '没有成功读取线上赞助名单。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.refreshSponsorsButton, '刷新名单', false);
  }
}

function showOnlineNotices() {
  if (state.settings.onboarding?.completed !== true) return;
  const seenIds = new Set(state.onlineData?.seenNoticeIds || []);
  const notices = Array.isArray(state.onlineData?.notices) ? state.onlineData.notices : [];
  onlineNoticeQueue = notices
    .filter(notice => notice.popup !== false && !seenIds.has(notice.seenKey || notice.id))
    .slice(0, 5);
  window.setTimeout(openNextOnlineNotice, 650);
}

function openNextOnlineNotice() {
  if (!onlineNoticeQueue.length || activeOnlineNotice || state.settings.onboarding?.completed !== true) return;
  if (
    elements.customDialog.open
    || elements.confirmDialog.open
    || elements.donationDialog.open
    || elements.setupGuideDialog.open
    || elements.closeChoiceDialog.open
  ) {
    window.setTimeout(openNextOnlineNotice, 900);
    return;
  }

  activeOnlineNotice = onlineNoticeQueue.shift();
  renderOnlineNoticeDialog(activeOnlineNotice);
  elements.onlineNoticeDialog.showModal();
  elements.onlineNoticeOkButton.focus();
}

function renderOnlineNoticeDialog(notice) {
  const typeLabels = {
    info: '软件公告',
    success: '更新完成',
    warning: '重要提醒',
    error: '问题提示',
  };
  elements.onlineNoticeDialog.dataset.type = notice.type || 'info';
  elements.onlineNoticeType.textContent = typeLabels[notice.type] || typeLabels.info;
  elements.onlineNoticeTitle.textContent = notice.title || '软件公告';
  elements.onlineNoticeMessage.textContent = notice.message || '';
  const detail = String(notice.detail || '').trim();
  elements.onlineNoticeDetail.hidden = !detail;
  elements.onlineNoticeDetail.textContent = detail;
}

async function acknowledgeOnlineNotice() {
  const notice = activeOnlineNotice;
  if (!notice) {
    if (elements.onlineNoticeDialog.open) elements.onlineNoticeDialog.close();
    return;
  }

  activeOnlineNotice = null;
  if (elements.onlineNoticeDialog.open) elements.onlineNoticeDialog.close();

  const seenIds = new Set(state.onlineData?.seenNoticeIds || []);
  const seenKey = notice.seenKey || notice.id;
  seenIds.add(seenKey);
  state.onlineData = {
    ...state.onlineData,
    seenNoticeIds: [...seenIds],
  };

  try {
    const onlineData = await window.cs2Assistant.markOnlineNoticeSeen(seenKey);
    state.onlineData = { ...state.onlineData, ...(onlineData || {}) };
  } catch {}

  window.setTimeout(openNextOnlineNotice, 260);
}

function renderOnboarding() {
  const completed = state.settings.onboarding?.completed === true;
  elements.body.classList.toggle('is-onboarding', !completed);
  if (completed) {
    elements.body.classList.remove('is-onboarding-cfg-step');
    return;
  }

  const slide = onboardingSlides[onboardingStep] || onboardingSlides[0];
  const isCfgSlide = slide.action === 'cfg';
  elements.onboardingKicker.textContent = slide.kicker;
  elements.onboardingTitle.textContent = slide.title;
  elements.onboardingText.textContent = slide.text;
  renderOnboardingMedia(slide);
  elements.body.classList.toggle('is-onboarding-cfg-step', isCfgSlide);
  elements.onboardingCfgButton.hidden = !isCfgSlide;
  elements.onboardingCfgButton.textContent = '立即一键配置';
  elements.onboardingNextButton.textContent = isCfgSlide
    ? '跳过，稍后再配置'
    : onboardingStep === onboardingSlides.length - 1 ? '进入主页面' : '继续';
  renderOnboardingDots();
}

function renderOnboardingMedia(slide) {
  const showQq = slide.media === 'qq';
  elements.onboardingMedia.hidden = !showQq;
  elements.onboardingMedia.innerHTML = showQq
    ? '<img src="assets/author-qq.jpg" alt="反馈 QQ 二维码" />'
    : '';
}

function renderOnboardingDots() {
  const dotStep = 35;
  const x = (onboardingStep - (onboardingSlides.length - 1) / 2) * dotStep;
  elements.onboardingDots.style.setProperty('--dot-x', `${x}px`);
  elements.onboardingDots.style.setProperty('--dot-count', onboardingSlides.length);
  elements.onboardingDots.classList.add('is-moving');
  window.clearTimeout(renderOnboardingDots.timer);
  renderOnboardingDots.timer = window.setTimeout(() => {
    elements.onboardingDots.classList.remove('is-moving');
  }, 430);

  if (elements.onboardingDots.dataset.count === String(onboardingSlides.length)) {
    elements.onboardingDots.querySelectorAll('span').forEach((dot, index) => {
      dot.classList.toggle('is-active', index === onboardingStep);
      dot.setAttribute('aria-current', index === onboardingStep ? 'step' : 'false');
    });
    return;
  }

  elements.onboardingDots.dataset.count = String(onboardingSlides.length);
  elements.onboardingDots.innerHTML = `
    ${onboardingSlides.map((_item, index) => `
      <span class="${index === onboardingStep ? 'is-active' : ''}" aria-current="${index === onboardingStep ? 'step' : 'false'}"></span>
    `).join('')}
    <i class="onboarding-dot-current" aria-hidden="true"></i>
  `;
}

async function nextOnboardingStep() {
  if (onboardingAnimating) return;
  if (onboardingStep < onboardingSlides.length - 1) {
    await transitionOnboarding(() => {
      onboardingStep += 1;
      renderOnboarding();
    });
    return;
  }

  const settings = await window.cs2Assistant.completeOnboarding();
  state.settings = {
    ...state.settings,
    ...settings,
    onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
  };
  render();
  refreshOnlineData(true);
  window.setTimeout(() => {
    if (state.cfgStatus?.installed && state.cfgStatus?.valid) showSetupGuideAfterConfig();
  }, 260);
}

function maybeShowDonationPrompt(forceCheck = false) {
  if (donationPromptChecked && !forceCheck) return;
  if (state.settings.onboarding?.completed !== true) return;
  if (!hasCompletedFirstConnection()) return;
  donationPromptChecked = true;
  if (Math.floor(Math.random() * 10) !== 0) return;

  window.setTimeout(() => {
    if (elements.customDialog.open || elements.confirmDialog.open || elements.donationDialog.open || elements.onlineNoticeDialog.open) return;
    elements.donationDialog.showModal();
    elements.donationLaterButton.focus();
  }, 850);
}

function hasCompletedFirstConnection() {
  const cfgReady = Boolean(state.cfgStatus?.installed && state.cfgStatus?.valid);
  const setupGuideSeen = state.settings.setupGuideSeen === true;
  const hasGsiSignal = Boolean(state.game?.connected || state.game?.lastPayloadAt);
  return cfgReady && setupGuideSeen && hasGsiSignal;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function transitionOnboarding(update) {
  onboardingAnimating = true;
  elements.body.classList.add('is-onboarding-changing');
  await wait(180);
  update();
  await wait(30);
  elements.body.classList.remove('is-onboarding-changing');
  await wait(180);
  onboardingAnimating = false;
}

async function restartOnboarding() {
  onboardingStep = 0;
  const settings = await window.cs2Assistant.restartOnboarding();
  state.settings = {
    ...state.settings,
    ...settings,
    onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
  };
  render();
}

function applyTheme(theme) {
  applyThemeClass(elements.body, theme);
}

function getAccentColor() {
  const value = state.settings?.accentColor;
  return accentColorOptions.some(option => option.id === value) ? value : 'green';
}

function applyAccentColor(color = getAccentColor()) {
  applyAccentClass(elements.body, color);
}

function applyPerformanceMode() {
  elements.body.classList.toggle('low-performance-mode', Boolean(state.settings.lowPerformanceMode));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeBackgroundSettings(value = {}) {
  const mode = ['none', 'official', 'custom'].includes(value.mode) ? value.mode : 'none';
  const presetId = value.presetId || 'cs2-classic';
  return {
    ...value,
    mode,
    presetId,
    brightness: clampNumber(Number(value.brightness), 45, 120, 82),
    blur: clampNumber(Number(value.blur), 0, 24, 0),
    panelOpacity: clampNumber(Number(value.panelOpacity), 58, 100, 92),
  };
}

function getBackgroundImage(background = normalizeBackgroundSettings(state.settings.background || {})) {
  if (background.mode === 'official') {
    const presets = Array.isArray(background.presets) ? background.presets : [];
    const preset = presets.find(item => item.id === background.presetId) || { file: 'assets/backgrounds/cs2-classic.jpg' };
    return preset.file || 'assets/backgrounds/cs2-classic.jpg';
  }
  if (background.mode === 'custom') {
    return background.customImageUrl || '';
  }
  return '';
}

function toCssUrl(url) {
  return `url("${String(url || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}

function applyBackgroundSettings() {
  const background = normalizeBackgroundSettings(state.settings.background || {});
  const image = getBackgroundImage(background);
  const hasImage = Boolean(image);
  elements.body.classList.toggle('has-app-background', hasImage);
  document.documentElement.style.setProperty('--app-bg-image', hasImage ? toCssUrl(image) : 'none');
  document.documentElement.style.setProperty('--app-bg-brightness', `${background.brightness}%`);
  document.documentElement.style.setProperty('--app-bg-blur', `${background.blur}px`);
  document.documentElement.style.setProperty('--app-panel-opacity', `${background.panelOpacity}%`);
  if (elements.backgroundPreview) {
    elements.backgroundPreview.classList.toggle('has-image', hasImage);
    elements.backgroundPreview.style.backgroundImage = hasImage ? toCssUrl(image) : '';
  }
}

function getCfgLocationText(cfgStatus = {}) {
  const paths = Array.isArray(cfgStatus.paths) ? cfgStatus.paths.filter(Boolean) : [];
  const primaryPath = cfgStatus.path || state.settings.cfgPath || state.settings.cs2Path;
  if (paths.length > 1) return `已写入 ${paths.length} 个位置：${primaryPath}`;
  return primaryPath || '尚未写入';
}

function renderSettings() {
  const cfgStatus = state.cfgStatus || {};
  const cfgPath = getCfgLocationText(cfgStatus);
  const cfgValid = Boolean(cfgStatus.installed && cfgStatus.valid);
  const appEnabled = state.settings.enabled !== false;
  const bombDurationSec = getBombDurationSec();
  applyPerformanceMode();
  elements.body.classList.toggle('is-app-disabled', !appEnabled);
  elements.masterEnabled.checked = appEnabled;
  elements.settingsEnabled.checked = appEnabled;
  elements.lowPerformanceMode.checked = Boolean(state.settings.lowPerformanceMode);
  elements.killSoundVolumeSelect.value = String(getKillSoundVolumePercent());
  elements.duckCs2Audio.checked = Boolean(state.settings.audio?.duckCs2OnKill);
  elements.launchAtStartup.checked = Boolean(state.settings.launchAtStartup);
  elements.masterEnabledText.textContent = appEnabled ? '运行中' : '已暂停';
  elements.bombDurationSelect.value = String(bombDurationSec);
  elements.toggleOrbButton.disabled = !appEnabled;
  elements.orbVisible.checked = state.settings.orb?.visible !== false;
  elements.orbVisible.disabled = !appEnabled;
  renderAccentColorPicker();
  renderBackgroundSettings();
  elements.cfgPathText.textContent = cfgPath;
  elements.cfgStatusText.textContent = cfgStatus.message || '尚未完成游戏配置';
  elements.cfgStatusBadge.textContent = cfgValid ? '正常' : cfgStatus.installed ? '需检查' : '未写入';
  elements.cfgStatusBadge.classList.toggle('is-ok', cfgValid);
  elements.cfgStatusBadge.classList.toggle('is-warning', !cfgValid && Boolean(cfgStatus.installed));
  elements.cfgStatusBadge.classList.toggle('is-muted', !cfgStatus.installed);
  renderMonitorOverlaySettings();
  renderOverviewStatus();
}

function handleSettingsFilterClick(event) {
  const button = event.target.closest('[data-settings-filter]');
  if (!button) return;
  const target = button.dataset.settingsFilter;
  elements.settingsFilter.querySelectorAll('[data-settings-filter]').forEach(item => {
    const active = item === button;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  elements.settingsPage.querySelectorAll('[data-settings-section]').forEach(section => {
    section.classList.toggle('is-active', section.dataset.settingsSection === target);
  });
}

function renderAccentColorPicker() {
  const current = getAccentColor();
  elements.accentColorPicker.innerHTML = accentColorOptions.map(option => `
    <button
      type="button"
      class="accent-swatch${option.id === current ? ' is-active' : ''}"
      data-accent-color="${option.id}"
      aria-label="切换为${option.label}强调色"
      aria-pressed="${option.id === current ? 'true' : 'false'}"
      title="${option.label}"
      style="--swatch-color: ${option.swatch}"
    >
      <span>${option.label}</span>
    </button>
  `).join('');
}

function renderBackgroundSettings() {
  const background = normalizeBackgroundSettings(state.settings.background || {});
  const presets = Array.isArray(background.presets) && background.presets.length
    ? background.presets
    : [{ id: 'cs2-classic', name: 'CS2经典背景' }];
  elements.backgroundPresetSelect.innerHTML = presets.map(preset => `
    <option value="${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>
  `).join('');
  elements.backgroundModeSelect.value = background.mode;
  elements.backgroundPresetSelect.value = background.presetId;
  elements.backgroundBrightnessSelect.value = String(background.brightness);
  elements.backgroundBlurSelect.value = String(background.blur);
  elements.backgroundPanelOpacitySelect.value = String(background.panelOpacity);
  elements.backgroundPresetSelect.disabled = background.mode !== 'official';
  elements.chooseBackgroundButton.disabled = false;

  const modeText = backgroundModeLabels[background.mode] || '无背景';
  const brightnessText = backgroundBrightnessLabels[background.brightness] || `${background.brightness}%`;
  const blurText = backgroundBlurLabels[background.blur] || `${background.blur}px`;
  const opacityText = backgroundPanelOpacityLabels[background.panelOpacity] || `${background.panelOpacity}%`;
  const imageReady = Boolean(getBackgroundImage(background));
  elements.backgroundSummary.textContent = background.mode === 'custom' && !imageReady
    ? '还没有上传自定义图片，当前仍使用纯色背景。'
    : `${modeText}，亮度${brightnessText}，模糊${blurText}，界面${opacityText}。`;
  elements.backgroundPreview.dataset.mode = imageReady ? modeText : '无背景';
  [
    elements.backgroundModeSelect,
    elements.backgroundPresetSelect,
    elements.backgroundBrightnessSelect,
    elements.backgroundBlurSelect,
    elements.backgroundPanelOpacitySelect,
  ].forEach(select => syncCustomSelect(select));
}

function renderServer() {
  elements.serverDetailText.textContent = state.server.error
    ? `接收失败：${state.server.error}`
    : state.server.running
      ? '助手已准备好。进入 CS2 后会自动收到游戏状态。'
      : '服务未启动，请重启软件。';
  renderOverviewStatus();
}

function renderGame() {
  renderOverviewStatus();
}

function renderBomb() {
  const bomb = state.bomb || {};
  const danger = Boolean(bomb.danger);
  elements.body.classList.toggle('is-bomb-active', Boolean(bomb.active));
  elements.body.classList.toggle('is-bomb-danger', danger);
  elements.serverDot.classList.toggle('danger', danger || Boolean(state.server.error));
  renderOverviewStatus();
}

function getBombDurationSec() {
  const value = Math.round(Number(state.settings?.bombDurationSec));
  return Number.isFinite(value) ? Math.max(35, Math.min(45, value)) : defaultBombDurationSec;
}

function getKillSoundVolumePercent() {
  const value = Math.round(Number(state.settings?.audio?.killSoundVolume));
  const allowed = [60, 80, 100, 120, 150];
  return allowed.includes(value) ? value : 100;
}

function getSoundGain(options = {}) {
  if (!options.isKillSound) return 1;
  return Math.max(0.4, Math.min(1.5, getKillSoundVolumePercent() / 100));
}

function renderOverviewStatus() {
  const appEnabled = state.settings.enabled !== false;
  const serverRunning = Boolean(state.server.running);
  const cfgStatus = state.cfgStatus || {};
  const cfgReady = Boolean(cfgStatus.installed && cfgStatus.valid);
  const ruleCount = (state.custom?.rules || []).length;
  const enabledRuleCount = (state.custom?.rules || []).filter(rule => rule.enabled).length;
  const customEnabled = state.custom?.enabled !== false;
  const orbVisible = state.settings.orb?.visible !== false;
  const gameRunning = Boolean(state.runtime?.gameRunning);
  const gsiConnected = Boolean(state.game?.connected);
  const usable = appEnabled && serverRunning && cfgReady && gameRunning && gsiConnected;

  const cfgLevel = cfgReady ? 'ok' : cfgStatus.installed ? 'warning' : 'bad';
  const gameLevel = gameRunning ? 'ok' : 'warning';
  const gsiLevel = gsiConnected ? 'ok' : gameRunning ? 'warning' : 'muted';
  const readyLevel = usable ? 'ok' : appEnabled ? 'warning' : 'bad';

  setHealthRow(elements.healthCfg, cfgLevel);
  setHealthRow(elements.healthGame, gameLevel);
  setHealthRow(elements.healthGsi, gsiLevel);
  setHealthRow(elements.healthReady, readyLevel);

  elements.homeCfgState.textContent = cfgReady ? '正确写入' : cfgStatus.installed ? '写入了，但需要检查' : '未写入';
  elements.homeCfgDetail.textContent = cfgStatus.message || (cfgReady ? 'CS2 已经能加载助手的 GSI 配置。' : '到“连接”页一键写入配置。');
  elements.homeCfgPath.textContent = getCfgLocationText(cfgStatus) || '无路径';

  elements.homeGameState.textContent = gameRunning ? '游戏已开启' : '未检测到 CS2';
  elements.homeGameDetail.textContent = state.runtime?.error || (gameRunning ? '已检测到 cs2.exe 正在运行。' : '打开 CS2 后，这一项会自动变为正常。');
  elements.homeGameTime.textContent = state.runtime?.checkedAt ? formatTime(state.runtime.checkedAt) : '未检查';

  elements.homeGsiState.textContent = gsiConnected ? '已收到信号' : '未收到 GSI';
  elements.homeGsiDetail.textContent = gsiConnected
    ? `最近状态：${state.game.phase || '游戏中'}。`
    : gameRunning
      ? '游戏开着，但还没有把状态发给助手。通常需要进图或重启 CS2。'
      : '先打开 CS2，再进入地图让游戏发送状态。';
  elements.homeGsiTime.textContent = state.game?.lastPayloadAt ? formatTime(state.game.lastPayloadAt) : '无记录';

  elements.homeUsableState.textContent = usable ? '可以正常使用' : appEnabled ? '还不能正常使用' : '软件已暂停';
  elements.homeUsableDetail.textContent = usable
    ? 'CFG、游戏进程和 GSI 信号都正常，自动功能和小窗可以工作。'
    : '上面有项目还没通过，按右侧下一步处理。';
  elements.homeUsableMeta.textContent = usable ? 'READY' : 'CHECK';

  const next = getHomeNextStep({ appEnabled, serverRunning, cfgReady, gameRunning, gsiConnected, ruleCount, enabledRuleCount, customEnabled });
  elements.homeVerdictBadge.textContent = usable ? '全部正常' : next.badge;
  elements.homeVerdictBadge.classList.toggle('is-ok', usable);
  elements.homeVerdictBadge.classList.toggle('is-warning', !usable && next.level === 'warning');
  elements.homeVerdictBadge.classList.toggle('is-muted', !usable && next.level === 'muted');
  elements.homeVerdictTitle.textContent = usable ? '可以开玩了' : next.title;
  elements.homeVerdictHint.textContent = usable
    ? '助手已经连上 CS2。你可以保持它在后台运行。'
    : next.detail;
  elements.homeReadyLabel.textContent = usable ? '可用' : '未就绪';
  elements.homeReadyValue.textContent = `${[appEnabled, serverRunning, cfgReady, gameRunning, gsiConnected].filter(Boolean).length}/5`;

  elements.homeNextTitle.textContent = next.title;
  elements.homeNextDetail.textContent = next.detail;
  elements.homeNextButton.textContent = next.button;
  elements.homeNextButton.dataset.target = next.target || '';
  elements.homeNextButton.disabled = !next.target;
  elements.homeRulesText.textContent = !appEnabled || !customEnabled ? '已暂停' : ruleCount ? `${enabledRuleCount}/${ruleCount} 开启` : '未添加';
  elements.homeOrbText.textContent = appEnabled ? (orbVisible ? '开启' : '关闭') : '已暂停';
  elements.homeServerText.textContent = serverRunning ? `本机端口 ${state.server.port}` : '未启动';
  elements.cfgHint.hidden = usable;
  elements.cfgHint.textContent = usable ? '' : next.detail;
  elements.serverDot.classList.toggle('offline', !appEnabled || !serverRunning);
  elements.serverDot.classList.toggle('danger', Boolean(state.server.error));
  elements.serverText.textContent = !appEnabled
    ? '已暂停'
    : !usable
      ? '需处理'
      : '运行中';
}

function getLevelClass(level) {
  if (level === 'ok') return 'is-ok';
  if (level === 'warning') return 'is-warning';
  if (level === 'bad') return 'is-bad';
  return 'is-muted';
}

function getBadgeClass(level) {
  if (level === 'ok') return 'is-ok';
  if (level === 'warning') return 'is-warning';
  if (level === 'bad') return 'is-danger';
  return 'is-muted';
}

function renderSelfCheckList(target, selfCheck = state.selfCheck) {
  if (!target) return;
  if (!selfCheck?.checks?.length) {
    target.innerHTML = '<div class="self-check-empty">点击“一键自检”查看当前问题。</div>';
    return;
  }
  target.innerHTML = selfCheck.checks.map(check => `
    <article class="self-check-item ${getLevelClass(check.level)}">
      <i></i>
      <div>
        <strong>${escapeHtml(check.label)}</strong>
        <span>${escapeHtml(check.detail || '')}</span>
      </div>
    </article>
  `).join('');
}

function renderSelfCheck() {
  renderSelfCheckList(elements.selfCheckList, state.selfCheck);
}

function renderDiagnosticsPanel() {
  const diagnostics = state.diagnostics;
  const selfCheck = diagnostics?.selfCheck || state.selfCheck;
  const level = selfCheck?.level || 'muted';
  elements.diagnosticsBadge.textContent = selfCheck?.title || '待检查';
  elements.diagnosticsBadge.classList.toggle('is-ok', level === 'ok');
  elements.diagnosticsBadge.classList.toggle('is-warning', level === 'warning');
  elements.diagnosticsBadge.classList.toggle('is-danger', level === 'bad');
  elements.diagnosticsBadge.classList.toggle('is-muted', !['ok', 'warning', 'bad'].includes(level));
  elements.diagnosticsSummaryText.textContent = selfCheck?.summary || '点击刷新后显示当前状态。';
  renderSelfCheckList(elements.diagnosticsCheckList, selfCheck);

  const logs = diagnostics?.custom?.recentLogs || state.custom?.recentLogs || [];
  elements.diagnosticLogList.innerHTML = logs.length
    ? logs.map(log => `
      <article class="diagnostic-log-item">
        <strong>${escapeHtml(log.name || '自动功能')}</strong>
        <span>${escapeHtml(log.action || '已触发')}</span>
        <small>${escapeHtml(formatTime(log.time))}</small>
      </article>
    `).join('')
    : '<div class="custom-empty"><strong>暂无触发记录</strong><span>触发自动功能或试听音效后，会出现在这里。</span></div>';
  elements.diagnosticText.textContent = diagnostics?.text || '还没有生成诊断信息。';
}

async function runSelfCheck() {
  setButtonBusy(elements.selfCheckButton, '检查中');
  try {
    state.selfCheck = await window.cs2Assistant.runSelfCheck();
    renderSelfCheck();
    renderDiagnosticsPanel();
    showToast({
      type: state.selfCheck.level === 'ok' ? 'success' : state.selfCheck.level === 'warning' ? 'warning' : 'error',
      title: state.selfCheck.title,
      message: state.selfCheck.summary,
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '自检失败',
      message: '没有成功完成自检。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.selfCheckButton, '一键自检', false);
  }
}

async function refreshDiagnostics() {
  setButtonBusy(elements.refreshDiagnosticsButton, '刷新中');
  try {
    state.diagnostics = await window.cs2Assistant.getDiagnostics();
    state.selfCheck = state.diagnostics.selfCheck;
    renderSelfCheck();
    renderDiagnosticsPanel();
  } catch (error) {
    showToast({
      type: 'error',
      title: '诊断失败',
      message: '没有成功生成诊断信息。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.refreshDiagnosticsButton, '刷新', false);
  }
}

async function copyDiagnostics() {
  setButtonBusy(elements.copyDiagnosticsButton, '复制中');
  try {
    state.diagnostics = await window.cs2Assistant.copyDiagnostics();
    state.selfCheck = state.diagnostics.selfCheck;
    renderSelfCheck();
    renderDiagnosticsPanel();
    showToast({ type: 'success', title: '已复制', message: '诊断信息已经复制到剪贴板。' });
  } catch (error) {
    showToast({
      type: 'error',
      title: '复制失败',
      message: '没有成功复制诊断信息。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.copyDiagnosticsButton, '复制诊断信息', false);
  }
}

function setHealthRow(row, level) {
  row.classList.toggle('is-ok', level === 'ok');
  row.classList.toggle('is-warning', level === 'warning');
  row.classList.toggle('is-bad', level === 'bad');
  row.classList.toggle('is-muted', level === 'muted');
}

function getHomeNextStep({ appEnabled, serverRunning, cfgReady, gameRunning, gsiConnected, ruleCount, enabledRuleCount, customEnabled }) {
  if (!appEnabled) {
    return { badge: '已暂停', level: 'muted', title: '打开软件总开关', detail: '总开关关闭后，自动功能、接收和小窗都会暂停。', button: '去设置', target: 'settingsPanel' };
  }
  if (!serverRunning) {
    return { badge: '服务异常', level: 'warning', title: '重启软件', detail: '本机接收服务没有启动，重启软件后通常会恢复。', button: '知道了', target: '' };
  }
  if (!cfgReady) {
    return { badge: '需要配置', level: 'warning', title: '写入 CFG 配置', detail: '到“连接”页点击“一键连接”，写入后重启 CS2。', button: '去连接', target: 'setupPanel' };
  }
  if (!gameRunning) {
    return { badge: '等待游戏', level: 'warning', title: '打开 CS2', detail: '已经写好 CFG。现在打开 CS2，并进入一张地图。', button: '去连接页', target: 'setupPanel' };
  }
  if (!gsiConnected) {
    return { badge: '等待信号', level: 'warning', title: '等待 GSI 信号', detail: 'CS2 已开启，但还没发来状态。进入地图或重启 CS2。', button: '模拟测试', target: 'setupPanel' };
  }
  if (!ruleCount) {
    return { badge: '基础可用', level: 'muted', title: '添加自动功能', detail: '连接已经正常。添加玩法后，助手会在游戏状态变化时自动执行动作。', button: '去添加', target: 'customPanel' };
  }
  if (!customEnabled || !enabledRuleCount) {
    return { badge: '玩法暂停', level: 'muted', title: '启用自动功能', detail: '连接正常，但自动功能当前不会触发。', button: '去开启', target: 'customPanel' };
  }
  return { badge: '全部正常', level: 'ok', title: '保持后台运行', detail: '现在不需要处理，直接开始游戏即可。', button: '无需操作', target: '' };
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value)) return '--';
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value)) return '--';
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatTime(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value)) return '--';
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function handleHomeNext() {
  const target = elements.homeNextButton.dataset.target;
  if (target) switchPanel(target);
}

function renderToolbox() {
  const toolbox = state.toolbox || {};
  const settings = state.settings.toolbox || {};
  const demos = toolbox.demos || { demos: [], dir: '', message: '' };
  elements.demoDirText.textContent = demos.dir || demos.message || '还没有选择 Demo 文件夹';
  elements.demoList.innerHTML = demos.demos?.length
    ? demos.demos.map(demo => `
      <article class="demo-item">
        <div>
          <strong>${escapeHtml(demo.name)}</strong>
          <span>${formatBytes(demo.size)} · ${formatDate(demo.modifiedAt)}</span>
        </div>
        <div class="button-group">
          <button class="secondary-button" data-demo-action="open" data-path="${escapeHtml(demo.path)}">回放</button>
          <button class="secondary-button danger-button" data-demo-action="delete" data-path="${escapeHtml(demo.path)}">删除</button>
        </div>
      </article>
    `).join('')
    : `<div class="custom-empty"><strong>没有 Demo</strong><span>${escapeHtml(demos.message || '选择文件夹后，这里会显示 .dem 文件。')}</span></div>`;

  elements.proProfileList.innerHTML = (toolbox.proProfiles || []).map(profile => {
    const active = settings.proProfileId === profile.id;
    return `
      <button class="profile-card ${active ? 'is-active' : ''}" type="button" data-profile-id="${escapeHtml(profile.id)}">
        <strong>${escapeHtml(profile.name)}</strong>
        <span>${escapeHtml(profile.description)}</span>
        <b>${active ? '已应用' : '应用'}</b>
      </button>
    `;
  }).join('');

  renderSelectOptions(elements.cs2FontSelect, toolbox.fontOptions || [], settings.cs2Font || 'default');
  renderSelectOptions(elements.cs2IntroSelect, toolbox.introOptions || [], settings.cs2Intro || 'default');
  renderLatency(toolbox.latencyTargets || []);
}

function renderSelectOptions(select, options, selected) {
  const selectedValue = String(selected ?? '');
  select.replaceChildren(...options.map(option => {
    const node = document.createElement('option');
    node.value = String(option.id);
    node.textContent = option.label;
    node.selected = String(option.id) === selectedValue;
    return node;
  }));
  select.value = selectedValue;
  enhanceSelects(select.parentElement || document);
  syncCustomSelect(select);
}

function renderLatency(items) {
  elements.latencyGrid.innerHTML = items.map(item => `
    <article class="metric-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${item.ms == null ? '--' : `${item.ms} ms`}</strong>
      <small>${escapeHtml(item.message || item.host || '等待检测')}</small>
    </article>
  `).join('');
}

function renderMonitor(snapshot) {
  const metric = (label, value, suffix = '', hint = '') => ({ label, value: value == null ? '--' : `${value}${suffix}`, hint });
  const metrics = snapshot
    ? [
      metric('游戏 FPS', snapshot.fps, '', 'CS2 未开放到 GSI，暂不可读'),
      metric('GPU 占用', snapshot.gpuUsage, '%', snapshot.source),
      metric('GPU 温度', snapshot.gpuTemp, '°C', snapshot.source),
      metric('CPU 占用', snapshot.cpuUsage, '%', '系统采样'),
      metric('CPU 温度', snapshot.cpuTemp, '°C', 'Windows 通常不开放'),
      metric('显存状态', snapshot.vramUsed == null ? null : `${snapshot.vramUsed} / ${snapshot.vramTotal} MB`, '', snapshot.source),
      metric('显卡电压', snapshot.gpuVoltage, ' V', '驱动未提供时不可读'),
      metric('显卡功耗', snapshot.gpuPower, ' W', snapshot.source),
    ]
    : [
      metric('游戏 FPS', null, '', '等待开启'),
      metric('GPU 占用', null, '', '等待开启'),
      metric('GPU 温度', null, '', '等待开启'),
      metric('CPU 占用', null, '', '等待开启'),
      metric('CPU 温度', null, '', '等待开启'),
      metric('显存状态', null, '', '等待开启'),
      metric('显卡电压', null, '', '等待开启'),
      metric('显卡功耗', null, '', '等待开启'),
    ];
  elements.monitorGrid.innerHTML = metrics.map(item => `
    <article class="metric-card">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(String(item.value))}</strong>
      <small>${escapeHtml(item.hint)}</small>
    </article>
  `).join('');
  elements.monitorHint.textContent = snapshot
    ? `最后刷新：${new Date(snapshot.at).toLocaleTimeString('zh-CN')}。读不到的项目说明系统或驱动没有开放。`
    : '监控关闭中。打开右上角开关后，每 2 秒刷新一次。';
}

function getMonitorOverlaySettings() {
  const saved = state.settings?.monitorOverlay || {};
  const itemIds = new Set(monitorOverlayItems.map(item => item.id));
  const colorIds = new Set(monitorOverlayColors.map(item => item.id));
  const opacityIds = new Set(monitorOverlayOpacityOptions.map(item => item.id));
  const items = Array.isArray(saved.items)
    ? saved.items.filter(item => itemIds.has(item))
    : [];
  const opacity = String(saved.opacity ?? '0.86');
  return {
    visible: Boolean(saved.visible),
    color: colorIds.has(saved.color) ? saved.color : 'green',
    opacity: opacityIds.has(opacity) ? opacity : '0.86',
    compact: Boolean(saved.compact),
    items: items.length ? items : monitorOverlayDefaultItems,
  };
}

function renderMonitorOverlaySettings() {
  const overlay = getMonitorOverlaySettings();
  elements.monitorOverlayVisible.checked = overlay.visible;
  elements.monitorOverlayCompact.checked = overlay.compact;
  renderSelectOptions(elements.monitorOverlayColor, monitorOverlayColors, overlay.color);
  renderSelectOptions(elements.monitorOverlayOpacity, monitorOverlayOpacityOptions, overlay.opacity);
  elements.monitorOverlayItems.innerHTML = monitorOverlayItems.map(item => `
    <label class="monitor-overlay-item">
      <input type="checkbox" value="${escapeHtml(item.id)}" ${overlay.items.includes(item.id) ? 'checked' : ''} />
      <span>${escapeHtml(item.label)}</span>
    </label>
  `).join('');
  const names = monitorOverlayItems
    .filter(item => overlay.items.includes(item.id))
    .map(item => item.label)
    .slice(0, 3)
    .join('、');
  elements.monitorOverlaySummary.textContent = overlay.visible
    ? `已开启，显示 ${overlay.items.length} 项：${names}${overlay.items.length > 3 ? ' 等' : ''}。`
    : '关闭中。打开后会置顶显示你选择的数据。';
}

function getOrbSettings() {
  const saved = state.settings?.orb || {};
  const sizeIds = new Set(orbSizeOptions.map(option => option.id));
  const textIds = new Set(orbTextModeOptions.map(option => option.id));
  const ringIds = new Set(orbRingModeOptions.map(option => option.id));
  const size = String(saved.size ?? '92');
  return {
    visible: saved.visible !== false,
    size: sizeIds.has(size) ? size : '92',
    textMode: textIds.has(saved.textMode) ? saved.textMode : 'auto',
    ringMode: ringIds.has(saved.ringMode) ? saved.ringMode : 'auto',
  };
}

function getOptionLabel(options, id) {
  return options.find(option => option.id === id)?.label || id;
}

function renderOrbSettings() {
  const appEnabled = state.settings.enabled !== false;
  const orbSettings = getOrbSettings();
  elements.orbPanelVisible.checked = orbSettings.visible;
  elements.orbPanelVisible.disabled = !appEnabled;
  elements.orbSizeSelect.disabled = !appEnabled;
  elements.orbTextModeSelect.disabled = !appEnabled;
  elements.orbRingModeSelect.disabled = !appEnabled;
  elements.orbPanelResetButton.disabled = !appEnabled;
  renderSelectOptions(elements.orbSizeSelect, orbSizeOptions, orbSettings.size);
  renderSelectOptions(elements.orbTextModeSelect, orbTextModeOptions, orbSettings.textMode);
  renderSelectOptions(elements.orbRingModeSelect, orbRingModeOptions, orbSettings.ringMode);

  const previewSize = Math.max(80, Math.min(128, Number(orbSettings.size) || 92));
  elements.orbPreview.style.setProperty('--orb-preview-size', `${previewSize}px`);
  elements.orbPreviewRing.style.strokeDasharray = '270.18';
  elements.orbPreviewRing.style.strokeDashoffset = orbSettings.ringMode === 'none' ? '270.18' : '96';
  elements.orbPreview.classList.toggle('is-ring-hidden', orbSettings.ringMode === 'none');
  elements.orbPreviewLabel.textContent = getOptionLabel(orbTextModeOptions, orbSettings.textMode).replace(' 剩余时间', '');
  elements.orbPreviewValue.textContent = orbSettings.textMode === 'auto' ? '待命' : '--';
  elements.orbPreviewStatus.textContent = orbSettings.visible ? '悬浮球已开启' : '悬浮球已隐藏';
  elements.orbTextModeSummary.textContent = getOptionLabel(orbTextModeOptions, orbSettings.textMode);
  elements.orbRingModeSummary.textContent = getOptionLabel(orbRingModeOptions, orbSettings.ringMode);
}

function renderCustomPanel() {
  const custom = state.custom || {};
  const catalog = custom.catalog || [];
  const triggerCount = catalog.filter(item => item.triggerable).length;
  const rules = custom.rules || [];
  const enabledCount = rules.filter(rule => rule.enabled).length;

  elements.customEnabled.checked = custom.enabled !== false;
  elements.customEnabledText.textContent = custom.enabled === false ? '自动功能已暂停' : '自动功能已开启';
  elements.customSummaryText.textContent = rules.length
    ? `${enabledCount}/${rules.length} 个正在启用`
    : `可添加 ${triggerCount} 种触发玩法`;
  elements.customList.dataset.ruleCount = String(rules.length);
  renderOverviewStatus();

  if (!rules.length) {
    elements.customList.innerHTML = `
      <div class="custom-empty">
        <strong>还没有自动功能</strong>
        <span>推荐先添加预设。需要更细的玩法时，再新建手动规则。</span>
      </div>
    `;
    return;
  }

  elements.customList.innerHTML = `
    <div class="rule-list">
      ${rules.map((rule, index) => renderRuleCard(rule, index)).join('')}
    </div>
  `;
}

function renderRuleCard(rule, index = 0) {
  const config = getCustomConfig(rule);
  const preset = getOfficialPreset(rule.presetId);
  const isEventSoundboard = rule.source === 'preset' && rule.presetId === 'event-soundboard';
  const item = getCustomItem(rule.eventId);
  const eventSoundCount = state.custom?.eventSounds?.length || 0;
  const conditionText = item
    ? config.mode === 'equals'
      ? `${item.label} 等于 ${formatOptionLabel(item, config.value)}`
      : `${item.label} 发生变化`
    : '这个条件不可用';
  const actionText = getActionSummary(config);
  const soundPackText = getRuleSoundPackName(rule);
  const displayName = preset?.name || rule.name || '未命名功能';
  const displayDescription = preset?.description || rule.description || conditionText;
  const currentValue = state.custom?.values?.[rule.eventId] || '未收到';
  const statusText = config.enabled ? '开启' : '停用';
  const statusClass = config.enabled ? 'is-ok' : 'is-muted';
  const metaHtml = isEventSoundboard
    ? `
        <span class="custom-condition is-specific">已配置 ${eventSoundCount} 个音效</span>
        <span>可配置：死亡、回合开始/结束、切刀、切枪、切投掷物等</span>
      `
    : `
        <span class="custom-condition is-specific">${escapeHtml(conditionText)}</span>
        ${soundPackText ? `<span class="custom-condition is-specific">当前音效：${escapeHtml(soundPackText)}</span>` : ''}
        <span>${escapeHtml(actionText)}</span>
        <span>当前：<b data-rule-value="${escapeHtml(rule.eventId)}">${escapeHtml(currentValue)}</b></span>
      `;
  const sourceText = rule.source === 'preset' ? '官方玩法' : '手动规则';

  return `
    <article class="rule-card" style="--i: ${Math.min(index, 6)}" data-rule-id="${escapeHtml(rule.id)}" data-rule-event="${escapeHtml(rule.eventId)}">
      <div class="rule-card__main">
        <div>
          <div class="rule-card__title">
            <strong>${escapeHtml(displayName)}</strong>
            <span class="rule-source ${rule.source === 'preset' ? '' : 'is-manual'}">${sourceText}</span>
          </div>
          <p>${escapeHtml(displayDescription)}</p>
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <details class="rule-card__details">
        <summary>详情</summary>
        <div class="rule-card__meta">
          ${metaHtml}
        </div>
      </details>
      ${canChoosePresetSound(rule) && !isEventSoundboard ? `
        <div class="sound-test-strip" aria-label="击杀音效试听">
          <span>试听</span>
          ${[1, 2, 3, 4, 5].map(streak => `<button class="secondary-button" type="button" data-custom-test-sound="${escapeHtml(rule.id)}" data-streak="${streak}">${streak}杀</button>`).join('')}
        </div>
      ` : ''}
      <div class="rule-card__actions">
        ${canConfigureEventSoundboard(rule)
          ? `<button class="primary-button" type="button" data-custom-event-sounds="${escapeHtml(rule.id)}">配置音效</button>`
          : canChoosePresetSound(rule)
            ? `<button class="primary-button" type="button" data-custom-preset-sound="${escapeHtml(rule.id)}">选择音效</button>`
            : `<button class="primary-button" type="button" data-custom-test="${escapeHtml(rule.id)}">测试</button>`}
        <details class="rule-action-menu">
          <summary aria-label="更多操作">更多</summary>
          <div>
            ${canConfigureEventSoundboard(rule) || canChoosePresetSound(rule) ? `<button type="button" data-custom-test="${escapeHtml(rule.id)}">测试</button>` : ''}
            ${canConfigureEventSoundboard(rule) && canChoosePresetSound(rule) ? `<button type="button" data-custom-preset-sound="${escapeHtml(rule.id)}">选择音效</button>` : ''}
            ${rule.source === 'preset' ? '' : `<button type="button" data-custom-edit="${escapeHtml(rule.id)}">编辑</button>`}
            <button class="danger-button" type="button" data-custom-delete="${escapeHtml(rule.id)}">删除</button>
          </div>
        </details>
      </div>
    </article>
  `;
}

function renderCustomEditor(item, config) {
  const options = item.options || [];
  const selectedValue = options.some(option => String(option.value) === config.value)
    ? config.value
    : String(options[0]?.value || '');
  const cooldownOptions = [3, 5, 10, 15, 30, 60, 120, 300];
  const selectedCooldown = cooldownOptions.includes(Number(config.cooldownSec)) ? Number(config.cooldownSec) : 10;
  return `
    <div class="custom-editor">
      <section class="editor-step">
        <div class="editor-section-title">
          <b>1</b>
          <span>命名</span>
          <small>只用于列表里识别这个功能</small>
        </div>
        <label class="field-row">
          <span>名称</span>
          <input type="text" data-custom-field="name" value="${escapeHtml(config.name || '')}" maxlength="40" placeholder="例如：死亡后打开网页" />
        </label>
        <label class="field-row">
          <span>简介</span>
          <input type="text" data-custom-field="description" value="${escapeHtml(config.description || '')}" maxlength="120" placeholder="简单说明触发时会做什么" />
        </label>
      </section>

      <section class="editor-step">
        <div class="editor-section-title">
          <b>2</b>
          <span>什么时候执行</span>
          <small>先选发生什么事，再决定要不要限定情况</small>
        </div>
        <label class="field-row field-row--switch">
          <input type="checkbox" data-custom-field="enabled" ${config.enabled ? 'checked' : ''} />
          <span>开启这个功能</span>
        </label>
        <label class="field-row">
          <span>发生什么事</span>
          <select data-custom-field="eventId">
            ${getTriggerableItems().map(entry => `<option value="${escapeHtml(entry.id)}" ${entry.id === item.id ? 'selected' : ''}>${escapeHtml(entry.group)} / ${escapeHtml(entry.label)}</option>`).join('')}
          </select>
        </label>
        <label class="field-row">
          <span>执行条件</span>
          <select data-custom-field="mode">
            <option value="change" ${config.mode === 'change' ? 'selected' : ''}>发生变化</option>
            ${options.length ? `<option value="equals" ${config.mode === 'equals' ? 'selected' : ''}>等于选择情况</option>` : ''}
          </select>
        </label>
        <label class="field-row">
          <span>选择情况</span>
          <select data-custom-field="value" ${options.length ? '' : 'disabled'}>
            ${options.length
              ? options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === selectedValue ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
              : '<option value="">只能在变化时执行</option>'}
          </select>
        </label>
        <label class="field-row">
          <span>间隔时间</span>
          <select data-custom-field="cooldownSec">
            ${cooldownOptions.map(value => `<option value="${value}" ${value === selectedCooldown ? 'selected' : ''}>${value} 秒</option>`).join('')}
          </select>
        </label>
      </section>

      <section class="editor-step">
        <div class="editor-section-title">
          <b>3</b>
          <span>执行动作</span>
          <small>勾选动作后再填写内容</small>
        </div>
        <div class="action-grid">
          ${renderActionRow('openUrl', '打开网址', config.openUrl.enabled, config.openUrl.url, 'https://example.com', '', config.openUrl.closeOnRoundEnd)}
          ${renderActionRow('playSound', '播放声音', config.playSound.enabled, config.playSound.filePath, '选择声音文件', 'sound')}
          ${renderActionRow('openFile', '打开文件', config.openFile.enabled, config.openFile.filePath, '选择文件', 'file')}
          <label class="action-row action-row--simple">
            <input type="checkbox" data-custom-action="returnGame.enabled" ${config.returnGame.enabled ? 'checked' : ''} />
            <span>立即返回并置顶游戏</span>
          </label>
          <label class="action-row action-row--simple">
            <input type="checkbox" data-custom-action="returnGame.onRoundEnd" ${config.returnGame.onRoundEnd ? 'checked' : ''} />
            <span>回合结束置顶游戏</span>
          </label>
        </div>
      </section>
    </div>
  `;
}

function formatOptionLabel(item, value) {
  const option = item?.options?.find(entry => String(entry.value) === String(value));
  return option?.label || value || '选择情况';
}

function getActionSummary(config) {
  const actions = [];
  if (config.openUrl.enabled) {
    if (config.openUrl.closeOnBuyPhase) {
      actions.push('打开地图点位并在购买阶段关闭');
    } else {
      actions.push(config.openUrl.closeOnRoundEnd ? '打开网址并在回合结束关闭' : '打开网址');
    }
  }
  if (config.playSound.enabled) actions.push('播放声音');
  if (config.openFile.enabled) actions.push('打开文件');
  if (config.returnGame.enabled) actions.push('返回游戏');
  if (config.returnGame.onRoundEnd) actions.push('回合结束置顶游戏');
  if (config.returnGame.onBuyPhase) actions.push('购买阶段置顶游戏');
  return actions.length ? actions.join('、') : '未设置动作';
}

function renderActionRow(actionKey, label, enabled, value, placeholder, chooseKind = '', closeOnRoundEnd = false) {
  const valueTarget = `${actionKey}.${actionKey === 'openUrl' ? 'url' : 'filePath'}`;
  return `
    <div class="action-row ${enabled ? 'is-enabled' : ''}" data-action-row="${actionKey}">
      <input type="checkbox" data-custom-action="${actionKey}.enabled" ${enabled ? 'checked' : ''} />
      <span>${label}</span>
      <input type="text" data-custom-action="${valueTarget}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${enabled ? '' : 'disabled'} />
      ${chooseKind ? `<button class="secondary-button" type="button" data-custom-choose="${chooseKind}" data-custom-target="${actionKey}.filePath" ${enabled ? '' : 'disabled'}>选择</button>` : ''}
      ${actionKey === 'openUrl' ? `<label class="action-row__option"><input type="checkbox" data-custom-action="openUrl.closeOnRoundEnd" ${closeOnRoundEnd ? 'checked' : ''} ${enabled ? '' : 'disabled'} />回合结束关闭</label>` : ''}
    </div>
  `;
}

function renderCustomValues() {
  const values = state.custom?.values || {};
  elements.customList.querySelectorAll('[data-rule-value]').forEach(valueNode => {
    const itemId = valueNode.dataset.ruleValue;
    valueNode.textContent = values[itemId] || '未收到';
  });
}

function getCustomConfig(config = {}) {
  return {
    id: String(config.id || ''),
    source: config.source === 'preset' ? 'preset' : 'manual',
    presetId: String(config.presetId || ''),
    name: String(config.name || ''),
    description: String(config.description || ''),
    eventId: String(config.eventId || getTriggerableItems()[0]?.id || ''),
    enabled: config.enabled === undefined ? true : Boolean(config.enabled),
    mode: config.mode === 'equals' ? 'equals' : 'change',
    value: String(config.value || ''),
    cooldownSec: Number.isFinite(Number(config.cooldownSec)) ? Number(config.cooldownSec) : 10,
    openUrl: {
      enabled: Boolean(config.openUrl?.enabled),
      url: String(config.openUrl?.url || ''),
      closeOnRoundEnd: Boolean(config.openUrl?.closeOnRoundEnd),
      closeOnBuyPhase: Boolean(config.openUrl?.closeOnBuyPhase),
    },
    playSound: {
      enabled: Boolean(config.playSound?.enabled),
      filePath: String(config.playSound?.filePath || ''),
      filePathByValue: config.playSound?.filePathByValue && typeof config.playSound.filePathByValue === 'object'
        ? Object.fromEntries(Object.entries(config.playSound.filePathByValue).map(([key, value]) => [String(key), String(value)]))
        : {},
      soundPackId: String(config.playSound?.soundPackId || ''),
      soundPackName: String(config.playSound?.soundPackName || ''),
      useKillStreak: Boolean(config.playSound?.useKillStreak),
    },
    eventSoundboard: Boolean(config.eventSoundboard),
    openFile: {
      enabled: Boolean(config.openFile?.enabled),
      filePath: String(config.openFile?.filePath || ''),
    },
    returnGame: {
      enabled: Boolean(config.returnGame?.enabled),
      onRoundEnd: Boolean(config.returnGame?.onRoundEnd),
      onBuyPhase: Boolean(config.returnGame?.onBuyPhase),
    },
  };
}

function readCustomConfig() {
  const root = elements.customDialogBody;
  const getField = name => root.querySelector(`[data-custom-field="${name}"]`);
  const getAction = name => root.querySelector(`[data-custom-action="${name}"]`);
  const currentRule = currentCustomRuleId ? getCustomRule(currentCustomRuleId) : null;
  return {
    name: getField('name')?.value || '',
    description: getField('description')?.value || '',
    enabled: getField('enabled')?.checked || false,
    eventId: getField('eventId')?.value || '',
    mode: getField('mode')?.value || 'change',
    value: getField('value')?.value || '',
    cooldownSec: getField('cooldownSec')?.value || 10,
    openUrl: {
      enabled: getAction('openUrl.enabled')?.checked || false,
      url: getAction('openUrl.url')?.value || '',
      closeOnRoundEnd: getAction('openUrl.closeOnRoundEnd')?.checked || false,
      closeOnBuyPhase: Boolean(currentRule?.openUrl?.closeOnBuyPhase),
    },
    playSound: {
      enabled: getAction('playSound.enabled')?.checked || false,
      filePath: getAction('playSound.filePath')?.value || '',
    },
    openFile: {
      enabled: getAction('openFile.enabled')?.checked || false,
      filePath: getAction('openFile.filePath')?.value || '',
    },
    returnGame: {
      enabled: getAction('returnGame.enabled')?.checked || false,
      onRoundEnd: getAction('returnGame.onRoundEnd')?.checked || false,
      onBuyPhase: Boolean(currentRule?.returnGame?.onBuyPhase),
    },
  };
}

async function handleCustomClick(event) {
  const addEmptyButton = event.target.closest('[data-custom-add-empty]');
  if (addEmptyButton) {
    openCustomAddDialog();
    return;
  }

  const editButton = event.target.closest('[data-custom-edit]');
  if (editButton) {
    const rule = getCustomRule(editButton.dataset.customEdit);
    if (!rule || rule.source === 'preset') return;
    openCustomRuleDialog(rule.id);
    return;
  }

  const soundButton = event.target.closest('[data-custom-preset-sound]');
  if (soundButton) {
    openPresetSoundDialog(soundButton.dataset.customPresetSound);
    return;
  }

  const eventSoundsButton = event.target.closest('[data-custom-event-sounds]');
  if (eventSoundsButton) {
    openEventSoundboardDialog(eventSoundsButton.dataset.customEventSounds);
    return;
  }

  const soundTestButton = event.target.closest('[data-custom-test-sound]');
  if (soundTestButton) {
    await testCustomSound(soundTestButton.dataset.customTestSound, soundTestButton.dataset.streak, soundTestButton);
    return;
  }

  const testButton = event.target.closest('[data-custom-test]');
  if (testButton) {
    await testCustomRule(testButton.dataset.customTest);
    return;
  }

  const deleteButton = event.target.closest('[data-custom-delete]');
  if (deleteButton) {
    await deleteCustomRule(deleteButton.dataset.customDelete);
  }
}

async function handleCustomDialogClick(event) {
  const openManualButton = event.target.closest('[data-custom-open-manual]');
  if (openManualButton) {
    openCustomRuleDialog(null);
    return;
  }

  const openPresetsButton = event.target.closest('[data-custom-open-presets]');
  if (openPresetsButton) {
    openPresetDialog();
    return;
  }

  const addPresetButton = event.target.closest('[data-custom-add-preset]');
  if (addPresetButton) {
    await addCustomPreset(addPresetButton.dataset.customAddPreset);
    return;
  }

  const choosePresetSoundButton = event.target.closest('[data-custom-choose-sound]');
  if (choosePresetSoundButton) {
    await choosePresetSound(choosePresetSoundButton.dataset.customPresetId, choosePresetSoundButton.dataset.customSoundPack);
    return;
  }

  const eventSoundsButton = event.target.closest('[data-custom-event-sounds]');
  if (eventSoundsButton) {
    openEventSoundboardDialog(eventSoundsButton.dataset.customEventSounds);
    return;
  }

  const openSoundImportButton = event.target.closest('[data-custom-open-sound-import]');
  if (openSoundImportButton) {
    openSoundPackImportDialog(openSoundImportButton.dataset.customRuleId);
    return;
  }

  const backToSoundListButton = event.target.closest('[data-custom-back-sound-list]');
  if (backToSoundListButton) {
    openPresetSoundDialog(backToSoundListButton.dataset.customRuleId);
    return;
  }

  const chooseSoundFileButton = event.target.closest('[data-custom-choose-sound-file]');
  if (chooseSoundFileButton) {
    const filePath = await window.cs2Assistant.chooseCustomFile('sound');
    if (filePath) {
      const input = elements.customDialogBody.querySelector(`[data-sound-streak="${chooseSoundFileButton.dataset.soundStreak}"]`);
      if (input) input.value = filePath;
    }
    return;
  }

  const saveSoundPackButton = event.target.closest('[data-custom-save-sound-pack]');
  if (saveSoundPackButton) {
    await saveCustomSoundPack(saveSoundPackButton.dataset.customRuleId);
    return;
  }

  const deleteSoundPackButton = event.target.closest('[data-custom-delete-sound-pack]');
  if (deleteSoundPackButton) {
    await deleteCustomSoundPack(deleteSoundPackButton.dataset.customPresetId, deleteSoundPackButton.dataset.customSoundPack);
    return;
  }

  const addEventSoundButton = event.target.closest('[data-custom-add-event-sound]');
  if (addEventSoundButton) {
    openEventSoundEditorDialog(addEventSoundButton.dataset.customRuleId);
    return;
  }

  const editEventSoundButton = event.target.closest('[data-custom-edit-event-sound]');
  if (editEventSoundButton) {
    openEventSoundEditorDialog(editEventSoundButton.dataset.customRuleId, editEventSoundButton.dataset.eventSoundId);
    return;
  }

  const testEventSoundButton = event.target.closest('[data-custom-test-event-sound]');
  if (testEventSoundButton) {
    await testEventSound(testEventSoundButton.dataset.eventSoundId);
    return;
  }

  const deleteEventSoundButton = event.target.closest('[data-custom-delete-event-sound]');
  if (deleteEventSoundButton) {
    await deleteEventSound(deleteEventSoundButton.dataset.eventSoundId, deleteEventSoundButton.dataset.customRuleId);
    return;
  }

  const backToEventSoundsButton = event.target.closest('[data-custom-back-event-sounds]');
  if (backToEventSoundsButton) {
    openEventSoundboardDialog(backToEventSoundsButton.dataset.customRuleId);
    return;
  }

  const saveEventSoundButton = event.target.closest('[data-custom-save-event-sound]');
  if (saveEventSoundButton) {
    await saveEventSound(saveEventSoundButton.dataset.customRuleId);
    return;
  }

  const chooseButton = event.target.closest('[data-custom-choose]');
  if (!chooseButton) return;

  const filePath = await window.cs2Assistant.chooseCustomFile(chooseButton.dataset.customChoose);
  if (filePath) {
    if (chooseButton.dataset.customTargetEventSound) {
      const input = elements.customDialogBody.querySelector(`[data-event-sound-field="${chooseButton.dataset.customTargetEventSound}"]`);
      if (input) input.value = filePath;
      return;
    }
    const input = elements.customDialogBody.querySelector(`[data-custom-action="${chooseButton.dataset.customTarget}"]`);
    if (input) input.value = filePath;
  }
}

function handleCustomDialogChange(event) {
  if (event.target.matches('[data-event-sound-field="filter"]')) {
    const selectedItem = renderEventSoundEventOptions(event.target.value);
    renderEventSoundValueOptions(selectedItem?.id || '');
    syncEventSoundEditorControls();
    return;
  }

  if (event.target.matches('[data-event-sound-field="eventId"]')) {
    renderEventSoundValueOptions(event.target.value);
    return;
  }

  if (event.target.matches('[data-event-sound-field="mode"]')) {
    syncEventSoundEditorControls();
    return;
  }

  if (event.target.matches('[data-custom-field="eventId"]')) {
    const nextItem = getCustomItem(event.target.value);
    const current = readCustomConfig();
    elements.customDialogBody.innerHTML = renderCustomEditor(nextItem, {
      ...current,
      eventId: nextItem?.id,
      value: nextItem?.options?.[0]?.value || '',
    });
    enhanceSelects(elements.customDialogBody);
    syncCustomDialogControls();
    return;
  }

  if (event.target.matches('[data-custom-field="mode"]')) {
    syncCustomDialogControls();
    return;
  }

  if (event.target.matches('[data-custom-action$=".enabled"]')) {
    syncCustomDialogControls();
  }
}

function openCustomRuleDialog(ruleId) {
  const rule = ruleId ? getCustomRule(ruleId) : null;
  if (rule?.source === 'preset') return;
  const config = getCustomConfig(rule || { name: '', enabled: true });
  const item = getCustomItem(config.eventId) || getTriggerableItems()[0];
  if (!item || !item.triggerable) return;

  currentCustomRuleId = ruleId;
  currentCustomDialogMode = ruleId ? 'edit-rule' : 'add-rule';
  elements.customDialogTitle.textContent = ruleId ? '编辑功能' : '手动添加';
  elements.customDialogSubtitle.textContent = ruleId ? (rule?.name || '更新条件和动作') : '选择什么时候执行、满足什么条件、要做什么';
  elements.customDialogSave.hidden = false;
  elements.customDialogTest.hidden = !ruleId;
  elements.customDialogBody.innerHTML = renderCustomEditor(item, config);
  enhanceSelects(elements.customDialogBody);
  syncCustomDialogControls();
  elements.customDialog.showModal();
  elements.customDialogBody.querySelector('input, .custom-select-button, button')?.focus();
}

function getCustomItem(itemId) {
  return (state.custom?.catalog || []).find(item => item.id === itemId);
}

function getOfficialPreset(presetId) {
  return (state.custom?.presets || []).find(preset => preset.id === presetId);
}

function canChoosePresetSound(rule) {
  const preset = rule?.source === 'preset' ? getOfficialPreset(rule.presetId) : null;
  return Boolean(preset?.soundPacks?.length);
}

function canConfigureEventSoundboard(rule) {
  return rule?.source === 'preset' && rule.presetId === 'event-soundboard';
}

function getRuleSoundPackName(rule) {
  if (!canChoosePresetSound(rule)) return '';
  const preset = getOfficialPreset(rule.presetId);
  const currentPackId = rule.playSound?.soundPackId || preset.soundPacks?.[0]?.id || '';
  return rule.playSound?.soundPackName
    || preset.soundPacks?.find(pack => pack.id === currentPackId)?.name
    || preset.soundPacks?.[0]?.name
    || '';
}

function getTriggerableItems() {
  return (state.custom?.catalog || []).filter(item => item.triggerable);
}

function getCustomRule(ruleId) {
  return (state.custom?.rules || []).find(rule => rule.id === ruleId);
}

function getEventSoundConfig(configId) {
  return (state.custom?.eventSounds || []).find(config => config.id === configId);
}

function getEventSoundLabel(config = {}) {
  const item = getCustomItem(config.eventId);
  if (!item) return '未知事件';
  if (config.mode === 'equals') {
    return `${item.label}：${formatOptionLabel(item, config.value)}`;
  }
  return `${item.label} 发生变化`;
}

function getEventSoundFilterForItem(item = {}) {
  if (!item?.id) return 'common';
  if (['player.event.death', 'round.phase', 'player.weapons.category', 'player.weapons.grenade', 'player.event.flashed', 'player.event.burning', 'player.state.round_kills'].includes(item.id)) return 'common';
  if (item.group === '回合' || item.group === '地图') return 'round';
  if (item.group === '武器') return 'weapon';
  if (item.group === '投掷物') return 'grenade';
  if (item.group === '受击状态') return 'effect';
  if (item.group === '玩家' || item.group === '玩家状态' || item.group === '玩家事件' || item.group === '比赛数据') return 'player';
  if (item.group === '炸弹' || item.group === '计时') return 'bomb';
  return 'all';
}

function getFilteredEventSoundItems(filterId = 'common') {
  const items = getTriggerableItems();
  if (filterId === 'all') return items;
  return items.filter(item => {
    if (filterId === 'common') {
      return ['player.event.death', 'round.phase', 'player.weapons.category', 'player.weapons.grenade', 'player.event.flashed', 'player.event.burning', 'player.state.round_kills'].includes(item.id);
    }
    return getEventSoundFilterForItem(item) === filterId;
  });
}

function renderEventSoundEventOptions(filterId = 'common', selectedEventId = '') {
  const eventSelect = elements.customDialogBody.querySelector('[data-event-sound-field="eventId"]');
  if (!eventSelect) return null;
  const items = getFilteredEventSoundItems(filterId);
  const selectedItem = items.find(item => item.id === selectedEventId) || items[0] || getTriggerableItems()[0];
  eventSelect.innerHTML = items.map(entry => `<option value="${escapeHtml(entry.id)}" ${entry.id === selectedItem?.id ? 'selected' : ''}>${escapeHtml(entry.group)} / ${escapeHtml(entry.label)}</option>`).join('');
  syncCustomSelect(eventSelect);
  return selectedItem;
}

function openEventSoundboardDialog(ruleId) {
  const rule = getCustomRule(ruleId);
  if (!canConfigureEventSoundboard(rule)) return;

  currentCustomRuleId = ruleId;
  currentCustomDialogMode = 'event-sounds';
  elements.customDialogTitle.textContent = '音效自定义';
  elements.customDialogSubtitle.textContent = '一个事件对应一个音频，可以添加多个';
  elements.customDialogSave.hidden = true;
  elements.customDialogTest.hidden = true;

  const configs = state.custom?.eventSounds || [];
  elements.customDialogBody.innerHTML = `
    <div class="sound-pack-toolbar">
      <div>
        <strong>已配置 ${configs.length} 个音效</strong>
        <span>适合死亡、回合开始/结束、切刀、切手枪、切长枪、拿出道具、被闪、被火烧等提示音。</span>
      </div>
      <button class="primary-button" type="button" data-custom-add-event-sound data-custom-rule-id="${escapeHtml(rule.id)}">新建音效</button>
    </div>
    <div class="event-sound-list">
      ${configs.map((config, index) => `
        <article class="event-sound-row" style="--i: ${Math.min(index, 6)}">
          <div>
            <strong>${escapeHtml(config.name || '自定义音效')}</strong>
            <span>${escapeHtml(getEventSoundLabel(config))}</span>
          </div>
          <small>${escapeHtml(shortPath(config.filePath || '未选择音频'))}</small>
          <div class="preset-card__actions">
            <button class="secondary-button" type="button" data-custom-test-event-sound data-event-sound-id="${escapeHtml(config.id)}">试听</button>
            <button class="secondary-button" type="button" data-custom-edit-event-sound data-custom-rule-id="${escapeHtml(rule.id)}" data-event-sound-id="${escapeHtml(config.id)}">编辑</button>
            <button class="secondary-button danger-button" type="button" data-custom-delete-event-sound data-custom-rule-id="${escapeHtml(rule.id)}" data-event-sound-id="${escapeHtml(config.id)}">删除</button>
          </div>
        </article>
      `).join('') || `
        <div class="custom-empty">
          <strong>还没有音效配置</strong>
          <span>点击“新建音效”，选择一个事件，再选择要播放的音频。</span>
        </div>
      `}
    </div>
  `;
  elements.customDialog.showModal();
  elements.customDialogBody.querySelector('button')?.focus();
}

function openEventSoundEditorDialog(ruleId, configId = '') {
  const rule = getCustomRule(ruleId);
  if (!canConfigureEventSoundboard(rule)) return;
  const existing = getEventSoundConfig(configId);
  const config = {
    id: existing?.id || '',
    name: existing?.name || '',
    enabled: existing?.enabled !== false,
    eventId: existing?.eventId || 'player.event.death',
    mode: existing?.mode || 'equals',
    value: existing?.value || 'dead',
    cooldownSec: Number.isFinite(Number(existing?.cooldownSec)) ? Number(existing.cooldownSec) : 1,
    filePath: existing?.filePath || '',
  };
  const item = getCustomItem(config.eventId) || getTriggerableItems()[0];
  const filterId = getEventSoundFilterForItem(item);
  const cooldownOptions = [0, 1, 2, 3, 5, 10, 15, 30, 60];

  currentCustomRuleId = ruleId;
  currentCustomDialogMode = 'event-sound-editor';
  elements.customDialogTitle.textContent = existing ? '编辑音效' : '新建音效';
  elements.customDialogSubtitle.textContent = '选择一个事件和一个音频';
  elements.customDialogSave.hidden = true;
  elements.customDialogTest.hidden = true;
  elements.customDialogBody.innerHTML = `
    <div class="sound-pack-editor event-sound-editor" data-event-sound-id="${escapeHtml(config.id)}">
      <label class="field-row field-row--switch">
        <input type="checkbox" data-event-sound-field="enabled" ${config.enabled ? 'checked' : ''} />
        <span>开启这个音效</span>
      </label>
      <label class="field-row">
        <span>名称</span>
        <input type="text" data-event-sound-field="name" maxlength="40" value="${escapeHtml(config.name)}" placeholder="例如：切刀提示音" />
      </label>
      <label class="field-row">
        <span>事件筛选</span>
        <select data-event-sound-field="filter">
          ${eventSoundFilterOptions.map(option => `<option value="${escapeHtml(option.id)}" ${option.id === filterId ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
        </select>
      </label>
      <label class="field-row">
        <span>事件</span>
        <select data-event-sound-field="eventId"></select>
      </label>
      <label class="field-row">
        <span>触发方式</span>
        <select data-event-sound-field="mode">
          <option value="equals" ${config.mode === 'equals' ? 'selected' : ''}>等于选择情况</option>
          <option value="change" ${config.mode === 'change' ? 'selected' : ''}>发生变化</option>
        </select>
      </label>
      <label class="field-row">
        <span>选择情况</span>
        <select data-event-sound-field="value"></select>
      </label>
      <label class="field-row">
        <span>间隔时间</span>
        <select data-event-sound-field="cooldownSec">
          ${cooldownOptions.map(value => `<option value="${value}" ${Number(config.cooldownSec) === value ? 'selected' : ''}>${value} 秒</option>`).join('')}
        </select>
      </label>
      <label class="sound-file-row">
        <span>音频</span>
        <input type="text" data-event-sound-field="filePath" value="${escapeHtml(config.filePath)}" placeholder="选择要播放的音频文件" readonly />
        <button class="secondary-button" type="button" data-custom-choose="sound" data-custom-target-event-sound="filePath">选择</button>
      </label>
      <div class="sound-pack-editor__footer">
        <button class="secondary-button" type="button" data-custom-back-event-sounds data-custom-rule-id="${escapeHtml(rule.id)}">返回</button>
        <button class="primary-button" type="button" data-custom-save-event-sound data-custom-rule-id="${escapeHtml(rule.id)}">保存音效</button>
      </div>
    </div>
  `;
  renderEventSoundEventOptions(filterId, item.id);
  renderEventSoundValueOptions(item.id, config.value);
  enhanceSelects(elements.customDialogBody);
  syncEventSoundEditorControls();
  elements.customDialogBody.querySelector('input, .custom-select-button, button')?.focus();
}

function renderEventSoundValueOptions(itemId, selectedValue = '') {
  const item = getCustomItem(itemId);
  const valueSelect = elements.customDialogBody.querySelector('[data-event-sound-field="value"]');
  if (!valueSelect) return;
  const options = item?.options || [];
  const nextValue = selectedValue || options[0]?.value || '';
  valueSelect.innerHTML = options.length
    ? options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(nextValue) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')
    : '<option value="">只能在变化时触发</option>';
  syncCustomSelect(valueSelect);
  syncEventSoundEditorControls();
}

function syncEventSoundEditorControls() {
  const modeSelect = elements.customDialogBody.querySelector('[data-event-sound-field="mode"]');
  const valueSelect = elements.customDialogBody.querySelector('[data-event-sound-field="value"]');
  const item = getCustomItem(elements.customDialogBody.querySelector('[data-event-sound-field="eventId"]')?.value);
  const hasOptions = Boolean(item?.options?.length);
  if (modeSelect && !hasOptions && modeSelect.value === 'equals') {
    modeSelect.value = 'change';
    syncCustomSelect(modeSelect);
  }
  if (valueSelect && modeSelect) valueSelect.disabled = modeSelect.value !== 'equals' || !hasOptions;
}

function readEventSoundConfig() {
  const root = elements.customDialogBody.querySelector('.event-sound-editor');
  const getField = name => root?.querySelector(`[data-event-sound-field="${name}"]`);
  const item = getCustomItem(getField('eventId')?.value);
  return {
    id: root?.dataset.eventSoundId || '',
    name: getField('name')?.value || item?.label || '自定义音效',
    enabled: getField('enabled')?.checked !== false,
    eventId: getField('eventId')?.value || '',
    mode: getField('mode')?.value || 'equals',
    value: getField('value')?.value || '',
    cooldownSec: getField('cooldownSec')?.value || 1,
    filePath: getField('filePath')?.value || '',
  };
}

async function saveEventSound(ruleId) {
  try {
    const custom = await window.cs2Assistant.saveEventSound(readEventSoundConfig());
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    openEventSoundboardDialog(ruleId);
    showToast({ type: 'success', title: '音效已保存', message: '这个事件音效已经加入音效自定义。' });
  } catch (error) {
    showToast({ type: 'error', title: '保存失败', message: '没有成功保存这个音效。', detail: error.message });
  }
}

async function testEventSound(configId) {
  try {
    await window.cs2Assistant.testEventSound(configId);
    showToast({ type: 'success', title: '已试听', message: '音效已经播放。' });
  } catch (error) {
    showToast({ type: 'error', title: '试听失败', message: '没有成功播放这个音效。', detail: error.message });
  }
}

async function deleteEventSound(configId, ruleId) {
  const confirmed = await askConfirm({ title: '删除音效', message: '确定删除这个事件音效？', okText: '删除' });
  if (!confirmed) return;
  try {
    const custom = await window.cs2Assistant.deleteEventSound(configId);
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    openEventSoundboardDialog(ruleId);
    showToast({ type: 'success', title: '音效已删除', message: '这个事件音效已经移除。' });
  } catch (error) {
    showToast({ type: 'error', title: '删除失败', message: '没有成功删除这个音效。', detail: error.message });
  }
}

function syncCustomDialogControls() {
  const modeSelect = elements.customDialogBody.querySelector('[data-custom-field="mode"]');
  const valueSelect = elements.customDialogBody.querySelector('[data-custom-field="value"]');
  if (valueSelect && modeSelect) valueSelect.disabled = modeSelect.value !== 'equals';

  elements.customDialogBody.querySelectorAll('[data-action-row]').forEach(row => {
    const actionKey = row.dataset.actionRow;
    const enabled = row.querySelector(`[data-custom-action="${actionKey}.enabled"]`)?.checked || false;
    const valueTarget = `${actionKey}.${actionKey === 'openUrl' ? 'url' : 'filePath'}`;
    row.classList.toggle('is-enabled', enabled);
    const valueInput = row.querySelector(`[data-custom-action="${valueTarget}"]`);
    if (valueInput) valueInput.disabled = !enabled;
    const chooseButton = row.querySelector('[data-custom-choose]');
    if (chooseButton) chooseButton.disabled = !enabled;
    row.querySelectorAll('.action-row__option input').forEach(input => {
      input.disabled = !enabled;
    });
  });
}

function openCustomAddDialog() {
  currentCustomRuleId = null;
  currentCustomDialogMode = 'add-choice';
  elements.customDialogTitle.textContent = '添加自动功能';
  elements.customDialogSubtitle.textContent = '选择添加方式';
  elements.customDialogSave.hidden = true;
  elements.customDialogTest.hidden = true;
  elements.customDialogBody.innerHTML = `
    <div class="add-choice-grid">
      <button class="choice-card" type="button" data-custom-open-presets>
        <strong>官方玩法</strong>
        <span>一键添加已经配置好的常用玩法。</span>
      </button>
      <button class="choice-card" type="button" data-custom-open-manual>
        <strong>手动添加</strong>
        <span>自己选择发生什么事、满足什么条件、要做什么动作。</span>
      </button>
    </div>
  `;
  elements.customDialog.showModal();
  elements.customDialogBody.querySelector('button')?.focus();
}

function openPresetDialog() {
  currentCustomDialogMode = 'preset-list';
  elements.customDialogTitle.textContent = '官方玩法';
  elements.customDialogSubtitle.textContent = '选择已经配置好的常用玩法';
  elements.customDialogSave.hidden = true;
  elements.customDialogTest.hidden = true;
  const presets = state.custom?.presets || [];
  const addedPresetIds = new Set((state.custom?.rules || [])
    .filter(rule => rule.source === 'preset' && rule.presetId)
    .map(rule => rule.presetId));
  elements.customDialogBody.innerHTML = `
    <div class="preset-list">
      ${presets.map((preset, index) => {
        const added = addedPresetIds.has(preset.id);
        const configurable = preset.configType === 'event-sounds';
        const boardRule = configurable
          ? (state.custom?.rules || []).find(rule => rule.source === 'preset' && rule.presetId === preset.id)
          : null;
        return `
        <article class="preset-card ${added ? 'is-added' : ''}" style="--i: ${Math.min(index, 6)}">
          <div>
            <strong>${escapeHtml(preset.name)}</strong>
            <span>${escapeHtml(preset.description)}</span>
          </div>
          ${added && configurable && boardRule
            ? `<button class="primary-button" type="button" data-custom-event-sounds="${escapeHtml(boardRule.id)}">配置</button>`
            : `<button class="${added ? 'secondary-button danger-button' : 'primary-button'}" type="button" data-custom-add-preset="${escapeHtml(preset.id)}">${added ? '删除' : '添加'}</button>`}
        </article>
      `;
      }).join('') || '<div class="empty-state">暂无官方玩法</div>'}
    </div>
  `;
  if (!elements.customDialog.open) elements.customDialog.showModal();
  elements.customDialogBody.querySelector('button')?.focus();
}

function openPresetSoundDialog(ruleId) {
  const rule = getCustomRule(ruleId);
  const preset = getOfficialPreset(rule?.presetId);
  if (!rule || !preset?.soundPacks?.length) return;

  currentCustomRuleId = ruleId;
  currentCustomDialogMode = 'preset-sound';
  elements.customDialogTitle.textContent = '选择击杀音效';
  elements.customDialogSubtitle.textContent = preset.name;
  elements.customDialogSave.hidden = true;
  elements.customDialogTest.hidden = true;

  const currentPackId = rule.playSound?.soundPackId || preset.soundPacks[0]?.id || '';
  elements.customDialogBody.innerHTML = `
    <div class="sound-pack-toolbar">
      <div>
        <strong>当前音效：${escapeHtml(getRuleSoundPackName(rule) || '未选择')}</strong>
        <span>内置音效只能使用，不能编辑；你可以导入自己的 1-5 杀音效。</span>
      </div>
      <button class="primary-button" type="button" data-custom-open-sound-import data-custom-rule-id="${escapeHtml(rule.id)}">导入音效包</button>
    </div>
    <div class="preset-list">
      ${preset.soundPacks.map((pack, index) => {
        const current = pack.id === currentPackId;
        const sourceText = pack.source === 'custom' ? '自定义' : '内置音效';
        return `
        <article class="preset-card ${current ? 'is-current-sound' : ''}" style="--i: ${Math.min(index, 6)}">
          <div>
            <strong>${escapeHtml(pack.name)} <small>${escapeHtml(sourceText)}</small></strong>
            <span>${current ? '当前正在使用' : '切换为这套击杀音效'}</span>
          </div>
          <div class="preset-card__actions">
            <button class="${current ? 'secondary-button' : 'primary-button'}" type="button" data-custom-preset-id="${escapeHtml(preset.id)}" data-custom-sound-pack="${escapeHtml(pack.id)}" data-custom-choose-sound ${current ? 'disabled' : ''}>${current ? '当前音效' : '选择'}</button>
            ${pack.editable ? `<button class="secondary-button danger-button" type="button" data-custom-preset-id="${escapeHtml(preset.id)}" data-custom-sound-pack="${escapeHtml(pack.id)}" data-custom-delete-sound-pack>删除</button>` : ''}
          </div>
        </article>
      `;
      }).join('')}
    </div>
  `;
  elements.customDialog.showModal();
  elements.customDialogBody.querySelector('button')?.focus();
}

function openSoundPackImportDialog(ruleId) {
  const rule = getCustomRule(ruleId);
  const preset = getOfficialPreset(rule?.presetId);
  if (!rule || !preset) return;

  currentCustomRuleId = ruleId;
  currentCustomDialogMode = 'sound-import';
  elements.customDialogTitle.textContent = '导入击杀音效包';
  elements.customDialogSubtitle.textContent = '选择 1-5 杀声音，保存后会直接使用';
  elements.customDialogSave.hidden = true;
  elements.customDialogTest.hidden = true;
  elements.customDialogBody.innerHTML = `
    <div class="sound-pack-editor">
      <label class="field-row">
        <span>音效名称</span>
        <input type="text" data-sound-pack-name maxlength="40" placeholder="例如：五杀音效包" />
      </label>
      ${[1, 2, 3, 4, 5].map(streak => `
        <label class="sound-file-row">
          <span>${streak} 杀</span>
          <input type="text" data-sound-streak="${streak}" placeholder="选择 ${streak} 杀音效文件" readonly />
          <button class="secondary-button" type="button" data-custom-choose-sound-file data-sound-streak="${streak}">选择</button>
        </label>
      `).join('')}
      <div class="sound-pack-editor__footer">
        <button class="secondary-button" type="button" data-custom-back-sound-list data-custom-rule-id="${escapeHtml(rule.id)}">返回</button>
        <button class="primary-button" type="button" data-custom-save-sound-pack data-custom-rule-id="${escapeHtml(rule.id)}">保存并使用</button>
      </div>
    </div>
  `;
  elements.customDialogBody.querySelector('[data-sound-pack-name]')?.focus();
}

async function setCustomEnabled(enabled) {
  const custom = await window.cs2Assistant.setCustomEnabled(enabled);
  state.custom = { ...state.custom, ...custom };
  renderCustomPanel();
  showToast({
    type: 'success',
    title: enabled ? '自动功能已开启' : '自动功能已暂停',
    message: enabled ? '已开启的自动功能会继续执行。' : '自动功能会保留设置，但暂时不执行。',
  });
}

async function choosePresetSound(presetId, soundPackId) {
  try {
    const custom = await window.cs2Assistant.setPresetSound(presetId, soundPackId);
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    elements.customDialog.close();
    const preset = getOfficialPreset(presetId);
    const pack = preset?.soundPacks?.find(item => item.id === soundPackId);
    showToast({
      type: 'success',
      title: '音效已切换',
      message: `当前音效：${pack?.name || '已选择'}`,
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '切换失败',
      message: '没有成功切换这个官方玩法的音效。',
      detail: error.message,
    });
  }
}

async function saveCustomSoundPack(ruleId) {
  const rule = getCustomRule(ruleId);
  if (!rule) return;
  const name = elements.customDialogBody.querySelector('[data-sound-pack-name]')?.value || '';
  const filePathByValue = {};
  elements.customDialogBody.querySelectorAll('[data-sound-streak]').forEach(input => {
    filePathByValue[input.dataset.soundStreak] = input.value || '';
  });
  try {
    const custom = await window.cs2Assistant.savePresetSoundPack(rule.presetId, { name, filePathByValue });
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    elements.customDialog.close();
    showToast({
      type: 'success',
      title: '音效包已保存',
      message: '新的击杀音效已经保存并切换使用。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '保存失败',
      message: '没有成功保存这套击杀音效。',
      detail: error.message,
    });
  }
}

async function deleteCustomSoundPack(presetId, soundPackId) {
  const confirmed = await askConfirm({
    title: '删除自定义音效',
    message: '确定删除这套自定义击杀音效？如果正在使用，会自动切回内置音效。',
    okText: '删除',
  });
  if (!confirmed) return;
  try {
    const custom = await window.cs2Assistant.deletePresetSoundPack(presetId, soundPackId);
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    elements.customDialog.close();
    showToast({
      type: 'success',
      title: '音效包已删除',
      message: '自定义击杀音效已经移除。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '删除失败',
      message: '没有成功删除这套击杀音效。',
      detail: error.message,
    });
  }
}

async function saveCustomDialog() {
  try {
    const nextRule = readCustomConfig();
    if (!nextRule.name.trim()) {
      nextRule.name = getCustomItem(nextRule.eventId)?.label || '未命名功能';
    }
    const custom = currentCustomRuleId
      ? await window.cs2Assistant.updateCustomRule(currentCustomRuleId, nextRule)
      : await window.cs2Assistant.addCustomRule(nextRule);
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    elements.customDialog.close();
    showToast({
      type: 'success',
      title: '功能已保存',
      message: '这个自动功能已经更新。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '保存失败',
      message: '没有成功保存这个自动功能。',
      detail: error.message,
    });
  }
}

async function testCustomDialog() {
  if (!currentCustomRuleId) return;
  try {
    const custom = await window.cs2Assistant.updateCustomRule(currentCustomRuleId, readCustomConfig());
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    await window.cs2Assistant.testCustomRule(currentCustomRuleId);
    showToast({
      type: 'success',
      title: '已测试动作',
      message: '软件已按当前保存的配置执行动作。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '测试失败',
      message: '请先保存可执行动作，再测试。',
      detail: error.message,
    });
  }
}

async function addCustomPreset(presetId) {
  const wasAdded = (state.custom?.rules || []).some(rule => rule.source === 'preset' && rule.presetId === presetId);
  try {
    const custom = await window.cs2Assistant.addCustomPreset(presetId);
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    elements.customDialog.close();
    showToast({
      type: 'success',
      title: wasAdded ? '玩法已删除' : '玩法已添加',
      message: wasAdded ? '这个官方玩法已经移除。' : '这个官方玩法已经添加。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: wasAdded ? '删除失败' : '添加失败',
      message: wasAdded ? '没有成功删除这个官方玩法。' : '没有成功添加这个官方玩法。',
      detail: error.message,
    });
  }
}

async function testCustomRule(ruleId) {
  try {
    await window.cs2Assistant.testCustomRule(ruleId);
    showToast({
      type: 'success',
      title: '已测试动作',
      message: '软件已按这个功能执行动作。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '测试失败',
      message: '没有成功执行这个功能。',
      detail: error.message,
    });
  }
}

async function testCustomSound(ruleId, streak, button = null) {
  if (button) setButtonBusy(button, '播放中');
  try {
    await window.cs2Assistant.testCustomSound(ruleId, streak);
    state.diagnostics = await window.cs2Assistant.getDiagnostics();
    state.selfCheck = state.diagnostics.selfCheck;
    renderDiagnosticsPanel();
    showToast({
      type: 'success',
      title: '已播放试听',
      message: `正在播放 ${streak} 杀音效。`,
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '试听失败',
      message: '没有成功播放这个击杀音效。',
      detail: error.message,
    });
  } finally {
    if (button) setButtonBusy(button, `${streak}杀`, false);
  }
}

function askConfirm({ title = '确认操作', message = '这个操作需要确认。', okText = '确认' } = {}) {
  if (confirmResolver) resolveConfirm(false);
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmOkButton.textContent = okText;
  elements.confirmDialog.showModal();
  elements.confirmCancelButton.focus();
  return new Promise(resolve => {
    confirmResolver = resolve;
  });
}

function resolveConfirm(value) {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  if (elements.confirmDialog.open) elements.confirmDialog.close();
  resolve(Boolean(value));
}

async function deleteCustomRule(ruleId) {
  const rule = getCustomRule(ruleId);
  if (!rule) return;
  const confirmed = await askConfirm({
    title: '删除自动功能',
    message: `确定删除“${rule.name || '未命名功能'}”？删除后不会再触发这个玩法。`,
    okText: '删除',
  });
  if (!confirmed) return;
  try {
    const custom = await window.cs2Assistant.deleteCustomRule(ruleId);
    state.custom = { ...state.custom, ...custom };
    renderCustomPanel();
    showToast({
      type: 'success',
      title: '功能已删除',
      message: '这个自动功能已经移除。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '删除失败',
      message: '没有成功删除这个自动功能。',
      detail: error.message,
    });
  }
}

function collectCustomSoundPaths(custom = state.custom) {
  const paths = [];
  for (const rule of custom?.rules || []) {
    const playSound = rule.playSound || {};
    if (!playSound.enabled) continue;
    if (playSound.filePath) paths.push(playSound.filePath);
    if (playSound.filePathByValue && typeof playSound.filePathByValue === 'object') {
      paths.push(...Object.values(playSound.filePathByValue).filter(Boolean));
    }
  }
  return [...new Set(paths.map(item => String(item)).filter(Boolean))];
}

function preloadCustomSounds(custom = state.custom) {
  const paths = collectCustomSoundPaths(custom);
  paths.forEach(preloadSoundFile);
  return Promise.allSettled(paths.map(preloadSoundBuffer).filter(Boolean));
}

function preloadSoundFile(filePath) {
  const key = String(filePath || '');
  if (!key) return null;
  preloadSoundBuffer(key);
  if (soundPools.has(key)) return soundPools.get(key);

  const src = toFileUrl(key);
  const pool = {
    index: 0,
    items: Array.from({ length: soundPoolSize }, () => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.load();
      return audio;
    }),
  };
  soundPools.set(key, pool);
  return pool;
}

function preloadSoundBuffer(filePath) {
  const key = String(filePath || '');
  if (!key) return null;
  if (soundBuffers.has(key)) return Promise.resolve(soundBuffers.get(key));
  if (soundBufferPromises.has(key)) return soundBufferPromises.get(key);

  const context = getAudioContext();
  if (!context) return null;

  const promise = fetch(toFileUrl(key), { cache: 'force-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`声音文件读取失败：${response.status}`);
      return response.arrayBuffer();
    })
    .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
    .then(buffer => {
      soundBuffers.set(key, buffer);
      return buffer;
    })
    .catch(error => {
      soundBufferPromises.delete(key);
      console.warn('声音预解码失败:', error);
      return null;
    });

  soundBufferPromises.set(key, promise);
  return promise;
}

function playSoundFile(filePath, options = {}) {
  primeAudioEngine();
  if (playDecodedSound(filePath, options)) return;

  const pool = preloadSoundFile(filePath);
  const audio = pool?.items?.[pool.index];
  if (!audio) return;

  pool.index = (pool.index + 1) % pool.items.length;
  audio.pause();
  audio.volume = Math.min(1, getSoundGain(options));
  try {
    audio.currentTime = 0;
  } catch {}
  audio.play().catch(error => {
    const now = Date.now();
    if (now - lastSoundErrorAt < 5000) return;
    lastSoundErrorAt = now;
    showToast({
      type: 'error',
      title: '声音播放失败',
      message: '没有成功播放声音。',
      detail: error.message,
    });
  });
}

function playDecodedSound(filePath, options = {}) {
  const key = String(filePath || '');
  const context = getAudioContext();
  const buffer = soundBuffers.get(key);
  if (!context || !buffer) {
    preloadSoundBuffer(key);
    return false;
  }
  if (context.state === 'suspended') context.resume().catch(() => {});

  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = getSoundGain(options);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
  source.start(context.currentTime);
  return true;
}

function toFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return encodeURI(`file://${prefixed}`).replace(/#/g, '%23');
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

async function chooseDemoDir() {
  setButtonBusy(elements.chooseDemoDirButton, '选择中');
  try {
    state.toolbox.demos = await window.cs2Assistant.chooseDemoDir();
    renderToolbox();
    showToast({
      type: 'success',
      title: 'Demo 文件夹已更新',
      message: state.toolbox.demos.message || '已经刷新 Demo 列表。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '选择失败',
      message: '没有成功读取 Demo 文件夹。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.chooseDemoDirButton, '选择文件夹', false);
  }
}

async function scanDemos() {
  setButtonBusy(elements.scanDemoButton, '刷新中');
  try {
    state.toolbox.demos = await window.cs2Assistant.scanDemos();
    renderToolbox();
  } catch (error) {
    showToast({
      type: 'error',
      title: '刷新失败',
      message: '没有成功扫描 Demo 文件。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.scanDemoButton, '刷新', false);
  }
}

async function handleDemoClick(event) {
  const button = event.target.closest('[data-demo-action]');
  if (!button) return;
  const filePath = button.dataset.path;
  const action = button.dataset.demoAction;
  try {
    if (action === 'open') {
      const result = await window.cs2Assistant.openDemo(filePath);
      showToast({
        type: 'success',
        title: '回放命令已复制',
        message: '已尝试启动 CS2。进入控制台粘贴命令即可回放 Demo。',
        detail: result.command,
      });
    }
    if (action === 'delete') {
      const name = filePath.split(/[\\/]/).pop() || '这个 Demo';
      const confirmed = await askConfirm({
        title: '删除 Demo',
        message: `确定删除“${name}”？这个操作不会进入软件回收站。`,
        okText: '删除',
      });
      if (!confirmed) return;
      state.toolbox.demos = await window.cs2Assistant.deleteDemo(filePath);
      renderToolbox();
      showToast({ type: 'success', title: 'Demo 已删除', message: '这个 .dem 文件已经删除。' });
    }
  } catch (error) {
    showToast({
      type: 'error',
      title: action === 'delete' ? '删除失败' : '打开失败',
      message: '没有完成 Demo 操作。',
      detail: error.message,
    });
  }
}

async function handleProProfileClick(event) {
  const button = event.target.closest('[data-profile-id]');
  if (!button) return;
  setButtonBusy(button, '应用中');
  try {
    const result = await window.cs2Assistant.applyProProfile(button.dataset.profileId);
    state.settings.toolbox = {
      ...(state.settings.toolbox || {}),
      proProfileId: result.profile.id,
    };
    renderToolbox();
    showToast({
      type: 'success',
      title: `已生成 ${result.profile.name} 设置`,
      message: '已写入独立 cfg。需要使用时，在 CS2 控制台输入 exec cs2_tool_profile。',
      detail: result.cfgPath,
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '应用失败',
      message: '没有成功写入职业选手设置。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(button, '应用', false);
  }
}

async function restoreProProfile() {
  setButtonBusy(elements.restoreProProfileButton, '恢复中');
  try {
    await window.cs2Assistant.restoreProProfile();
    state.settings.toolbox = {
      ...(state.settings.toolbox || {}),
      proProfileId: '',
    };
    renderToolbox();
    showToast({ type: 'success', title: '已恢复', message: '工具生成的职业选手 cfg 已移除。' });
  } catch (error) {
    showToast({
      type: 'error',
      title: '恢复失败',
      message: '没有成功恢复职业选手设置。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.restoreProProfileButton, '恢复默认', false);
  }
}

async function updateToolboxSetting(patch) {
  try {
    const toolbox = await window.cs2Assistant.updateToolboxSettings(patch);
    state.settings.toolbox = toolbox;
    renderToolbox();
    showToast({ type: 'success', title: '设置已保存', message: '工具盒子的设置已经更新。' });
  } catch (error) {
    showToast({
      type: 'error',
      title: '保存失败',
      message: '没有成功保存工具盒子设置。',
      detail: error.message,
    });
  }
}

async function testLatency() {
  setButtonBusy(elements.testLatencyButton, '检测中');
  renderLatency((state.toolbox.latencyTargets || []).map(item => ({ ...item, message: '检测中...' })));
  try {
    const results = await window.cs2Assistant.testLatency();
    renderLatency(results);
  } catch (error) {
    showToast({
      type: 'error',
      title: '延迟检测失败',
      message: '没有成功完成网络检测。',
      detail: error.message,
    });
    renderLatency(state.toolbox.latencyTargets || []);
  } finally {
    setButtonBusy(elements.testLatencyButton, '开始检测', false);
  }
}

function toggleMonitor(enabled) {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  if (!enabled) {
    renderMonitor(null);
    return;
  }
  refreshMonitor();
  monitorTimer = setInterval(refreshMonitor, 2000);
}

async function refreshMonitor() {
  try {
    const snapshot = await window.cs2Assistant.getMonitorSnapshot();
    renderMonitor(snapshot);
  } catch (error) {
    elements.monitorEnabled.checked = false;
    toggleMonitor(false);
    showToast({
      type: 'error',
      title: '监控读取失败',
      message: '没有成功读取硬件监控数据。',
      detail: error.message,
    });
  }
}

async function setMonitorOverlayVisible(visible) {
  try {
    const settings = await window.cs2Assistant.setMonitorOverlayVisible(visible);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderMonitorOverlaySettings();
    showToast({
      type: 'success',
      title: visible ? '监控悬浮窗已开启' : '监控悬浮窗已关闭',
      message: visible ? '进入游戏后也会置顶显示这些监控数据。' : '设置已保存，需要时可以再打开。',
    });
  } catch (error) {
    elements.monitorOverlayVisible.checked = !visible;
    showToast({
      type: 'error',
      title: '监控悬浮窗切换失败',
      message: '没有成功切换监控悬浮窗。',
      detail: error.message,
    });
  }
}

async function updateMonitorOverlay(patch) {
  const previous = { ...(state.settings.monitorOverlay || {}) };
  try {
    const settings = await window.cs2Assistant.updateMonitorOverlay(patch);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderMonitorOverlaySettings();
  } catch (error) {
    state.settings.monitorOverlay = previous;
    renderMonitorOverlaySettings();
    showToast({
      type: 'error',
      title: '监控悬浮窗设置失败',
      message: '没有成功保存这项显示设置。',
      detail: error.message,
    });
  }
}

function handleMonitorOverlayItemsChange() {
  const items = [...elements.monitorOverlayItems.querySelectorAll('input[type="checkbox"]:checked')]
    .map(input => input.value);
  if (!items.length) {
    renderMonitorOverlaySettings();
    showToast({
      type: 'warning',
      title: '至少保留一项',
      message: '监控悬浮窗需要至少显示一个数据。',
    });
    return;
  }
  updateMonitorOverlay({ items });
}

async function resetMonitorOverlayPosition() {
  try {
    const ok = await window.cs2Assistant.resetMonitorOverlayPosition();
    if (!ok) throw new Error('监控悬浮窗还没有准备好。');
    showToast({
      type: 'success',
      title: '位置已复位',
      message: '监控悬浮窗已回到屏幕右上区域。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '复位失败',
      message: '没有成功复位监控悬浮窗位置。',
      detail: error.message,
    });
  }
}

async function autoInstallCfg(event) {
  const fromOnboarding = state.settings.onboarding?.completed !== true
    && onboardingSlides[onboardingStep]?.action === 'cfg';
  const button = event?.currentTarget || (fromOnboarding ? elements.onboardingCfgButton : $('#autoInstallButton'));
  setButtonBusy(button, '写入中');
  try {
    const result = await window.cs2Assistant.autoInstallCfg();
    if (result?.ok) {
      mergeState({ settings: result.settings });
      state.cfgStatus = await window.cs2Assistant.getCfgStatus();
      const count = Array.isArray(result.cfgPaths) ? result.cfgPaths.length : 1;
      const locationText = count > 1 ? `已写入 ${count} 个 CS2 配置位置` : `游戏配置已完成：${result.cfgPath}`;
      elements.cfgHint.textContent = `${locationText}。请重启 CS2。`;
      showToast({
        type: 'success',
        title: '游戏已连接',
        message: count > 1
          ? `已自动找到并写入 ${count} 个 CS2 配置目录。请重启 CS2。`
          : '已自动找到 CS2 配置目录，并写入官方允许的状态配置。请重启 CS2。',
        detail: Array.isArray(result.cfgPaths) ? result.cfgPaths.join('\n') : result.cfgPath,
      });
      if (fromOnboarding) {
        await nextOnboardingStep();
      } else {
        showSetupGuideAfterConfig();
      }
    } else {
      const message = result?.message || '自动写入失败，请手动选择目录。';
      elements.cfgHint.textContent = message;
      showToast({
        type: 'warning',
        title: '未找到默认目录',
        message: `${message} 你可以点击“选择目录”，手动选择 CS2 的配置文件夹。`,
      });
    }
  } catch (error) {
    const message = `写入失败：${error.message}`;
    elements.cfgHint.textContent = message;
    showToast({
      type: 'error',
      title: '连接失败',
      message: '软件没有成功写入游戏配置。请检查目录权限，或手动选择 CS2 的配置文件夹后重试。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(button, fromOnboarding ? '立即一键配置' : '自动写入', false);
    renderSettings();
  }
}

async function chooseCfgDir() {
  const button = $('#chooseDirButton');
  setButtonBusy(button, '选择中');
  try {
    const result = await window.cs2Assistant.chooseCfgDir();
    if (result) {
      mergeState({ settings: result.settings });
      state.cfgStatus = await window.cs2Assistant.getCfgStatus();
      elements.cfgHint.textContent = `游戏配置已完成：${result.cfgPath}。请重启 CS2。`;
      showToast({
        type: 'success',
        title: '游戏已连接',
        message: '已写入状态配置。请重启 CS2，让游戏重新加载配置。',
        detail: result.cfgPath,
      });
      showSetupGuideAfterConfig();
    } else {
      showToast({
        type: 'warning',
        title: '已取消选择',
        message: '没有选择目录，游戏配置未完成。需要连接 CS2 时，可以再次点击“选择目录”。',
      });
    }
  } catch (error) {
    const message = `写入失败：${error.message}`;
    elements.cfgHint.textContent = message;
    showToast({
      type: 'error',
      title: '连接失败',
      message: '软件没有成功写入游戏配置。请确认你选择的是 CS2 的配置目录，并检查写入权限。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(button, '选择目录', false);
    renderSettings();
  }
}

function showSetupGuideAfterConfig() {
  if (state.settings.setupGuideSeen === true) return;
  if (state.settings.onboarding?.completed !== true) return;
  if (elements.setupGuideDialog.open) return;
  elements.setupGuideDialog.showModal();
  elements.setupGuideDoneButton.focus();
}

async function completeSetupGuide() {
  try {
    const settings = await window.cs2Assistant.completeSetupGuide();
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
  } catch {
    state.settings.setupGuideSeen = true;
  }
  if (elements.setupGuideDialog.open) elements.setupGuideDialog.close();
}

async function openCfgFolder() {
  const opened = await window.cs2Assistant.openCfgFolder();
  showToast({
    type: opened ? 'success' : 'warning',
    title: opened ? '已打开目录' : '没有可打开的目录',
    message: opened ? '已打开当前配置所在目录。' : '还没有选择配置目录，请先在“连接”里完成一键连接。',
  });
}

async function testGsiPayload() {
  const button = $('#testGsiButton');
  setButtonBusy(button, '模拟中');
  try {
    const nextState = await window.cs2Assistant.testGsiPayload();
    mergeState(nextState);
    render();
    showToast({
      type: 'success',
      title: '已模拟游戏状态',
      message: '当前状态已切到测试提醒，用来检查自动功能和游戏小窗是否正常。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '模拟失败',
      message: '没有成功发送测试状态。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(button, '模拟状态', false);
  }
}

async function resetGsiState() {
  const nextState = await window.cs2Assistant.resetGsiState();
  mergeState(nextState);
  render();
  showToast({
    type: 'success',
    title: '状态已重置',
    message: '提醒和工具状态已回到等待状态。',
  });
}

async function resetOrbPosition() {
  const ok = await window.cs2Assistant.resetOrbPosition();
  showToast({
    type: ok ? 'success' : 'warning',
    title: ok ? '游戏小窗已复位' : '游戏小窗不可用',
    message: ok ? '游戏小窗已回到主屏幕右侧默认位置。' : '当前没有可复位的游戏小窗。',
  });
}

async function setAccentColor(color) {
  const previousColor = getAccentColor();
  if (color === previousColor) return;
  state.settings.accentColor = color;
  applyAccentColor(color);
  renderAccentColorPicker();

  try {
    const settings = await window.cs2Assistant.setAccentColor(color);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderSettings();
    const label = accentColorOptions.find(option => option.id === getAccentColor())?.label || '默认';
    showToast({
      type: 'success',
      title: '强调色已更新',
      message: `全局强调色已切换为${label}。`,
    });
  } catch (error) {
    state.settings.accentColor = previousColor;
    applyAccentColor(previousColor);
    renderAccentColorPicker();
    showToast({
      type: 'error',
      title: '强调色保存失败',
      message: '没有成功更新全局强调色。',
      detail: error.message,
    });
  }
}

async function updateBackgroundSettings(patch) {
  const previous = { ...(state.settings.background || {}) };
  state.settings.background = normalizeBackgroundSettings({
    ...previous,
    ...(patch || {}),
  });
  applyBackgroundSettings();
  renderBackgroundSettings();

  try {
    const settings = await window.cs2Assistant.updateBackgroundSettings(patch);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    applyBackgroundSettings();
    renderSettings();
    return true;
  } catch (error) {
    state.settings.background = previous;
    applyBackgroundSettings();
    renderSettings();
    showToast({
      type: 'error',
      title: '背景设置失败',
      message: '没有成功保存背景设置。',
      detail: error.message,
    });
    return false;
  }
}

async function applyBackgroundFromControls() {
  setButtonBusy(elements.applyBackgroundButton, '应用中');
  try {
    const ok = await updateBackgroundSettings({
      mode: elements.backgroundModeSelect.value,
      presetId: elements.backgroundPresetSelect.value,
      brightness: Number(elements.backgroundBrightnessSelect.value),
      blur: Number(elements.backgroundBlurSelect.value),
      panelOpacity: Number(elements.backgroundPanelOpacitySelect.value),
    });
    if (!ok) return;
    showToast({
      type: 'success',
      title: '背景已应用',
      message: elements.backgroundModeSelect.value === 'none'
        ? '已恢复为纯色背景。'
        : '软件背景和界面透明度已经生效。',
    });
  } finally {
    setButtonBusy(elements.applyBackgroundButton, '应用背景', false);
  }
}

async function chooseBackgroundImage() {
  setButtonBusy(elements.chooseBackgroundButton, '选择中');
  try {
    const result = await window.cs2Assistant.chooseBackgroundImage();
    if (result?.canceled) return;
    const settings = result?.settings || result;
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    applyBackgroundSettings();
    renderSettings();
    showToast({
      type: 'success',
      title: '背景已更新',
      message: '自定义图片已保存到软件数据目录。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '背景图片导入失败',
      message: '没有成功导入这张图片。',
      detail: error.message,
    });
  } finally {
    setButtonBusy(elements.chooseBackgroundButton, '上传图片', false);
  }
}


async function updateOrbSettings(patch) {
  const previous = { ...(state.settings.orb || {}) };
  try {
    const settings = await window.cs2Assistant.updateOrbSettings(patch);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderSettings();
  } catch (error) {
    state.settings.orb = previous;
    renderSettings();
    showToast({
      type: 'error',
      title: '悬浮球设置失败',
      message: '没有成功保存这项显示设置。',
      detail: error.message,
    });
  }
}
async function setOrbVisible(visible) {
  try {
    const settings = await window.cs2Assistant.setOrbVisible(visible);
    state.settings = settings;
    renderSettings();
    showToast({
      type: 'success',
      title: visible ? '游戏小窗已显示' : '游戏小窗已隐藏',
      message: visible ? '游戏小窗会保持置顶，并在需要时显示提醒。' : '游戏小窗已隐藏。你可以随时在设置中重新显示。',
    });
  } catch (error) {
    elements.orbVisible.checked = !visible;
    showToast({
      type: 'error',
      title: '游戏小窗设置失败',
      message: '没有成功更新游戏小窗显示状态。',
      detail: error.message,
    });
  }
}

async function setLowPerformanceMode(enabled) {
  try {
    const settings = await window.cs2Assistant.setLowPerformance(enabled);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderSettings();
    showToast({
      type: 'success',
      title: enabled ? '低配置模式已开启' : '低配置模式已关闭',
      message: enabled ? '主窗口和游戏小窗动画会尽量关闭。' : '动画效果已恢复。',
    });
  } catch (error) {
    elements.lowPerformanceMode.checked = !enabled;
    showToast({
      type: 'error',
      title: '设置失败',
      message: '没有成功更新低配置模式。',
      detail: error.message,
    });
  }
}

async function setAudioSettings(patch) {
  const previousAudio = { ...(state.settings.audio || {}) };
  try {
    const settings = await window.cs2Assistant.setAudioSettings(patch);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderSettings();
    showToast({
      type: 'success',
      title: '声音设置已保存',
      message: settings.audio?.duckCs2OnKill ? '击杀音效会尝试压过游戏默认声音。' : '自定义击杀音效音量已更新。',
    });
  } catch (error) {
    state.settings.audio = previousAudio;
    renderSettings();
    showToast({
      type: 'error',
      title: '声音设置失败',
      message: '没有成功更新击杀音效设置。',
      detail: error.message,
    });
  }
}

async function setStartup(enabled) {
  try {
    const settings = await window.cs2Assistant.setStartup(enabled);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderSettings();
    showToast({
      type: 'success',
      title: enabled ? '已开启自启动' : '已关闭自启动',
      message: enabled ? '下次进入桌面后会自动启动软件。' : '软件不会再随系统启动。',
    });
  } catch (error) {
    elements.launchAtStartup.checked = !enabled;
    showToast({
      type: 'error',
      title: '自启动设置失败',
      message: '没有成功更新开机自启动。',
      detail: error.message,
    });
  }
}

async function setBombDurationSec(seconds) {
  const previous = getBombDurationSec();
  const next = Math.max(35, Math.min(45, Math.round(Number(seconds))));
  try {
    const settings = await window.cs2Assistant.setBombDuration(next);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    state.bomb = {
      ...state.bomb,
      remainingMs: state.bomb?.active ? state.bomb.remainingMs : getBombDurationSec() * 1000,
    };
    renderSettings();
    renderBomb();
    showToast({
      type: 'success',
      title: '提醒时间已更新',
      message: `新的提醒时间为 ${getBombDurationSec()} 秒。`,
    });
  } catch (error) {
    elements.bombDurationSelect.value = String(previous);
    showToast({
      type: 'error',
      title: '提醒时间保存失败',
      message: '没有成功更新提醒时间。',
      detail: error.message,
    });
  }
}

async function setAppEnabled(enabled) {
  try {
    const settings = await window.cs2Assistant.setEnabled(enabled);
    state.settings = {
      ...state.settings,
      ...settings,
      onboarding: { ...state.settings.onboarding, ...(settings.onboarding || {}) },
    };
    renderSettings();
    renderBomb();
    showToast({
      type: enabled ? 'success' : 'warning',
      title: enabled ? '软件已开启' : '软件已暂停',
      message: enabled ? '自动功能、提醒和游戏小窗已恢复。' : '自动功能、提醒和游戏小窗已暂停。',
    });
  } catch (error) {
    elements.masterEnabled.checked = !enabled;
    elements.settingsEnabled.checked = !enabled;
    showToast({
      type: 'error',
      title: '总开关切换失败',
      message: '没有成功更新软件总开关。',
      detail: error.message,
    });
  }
}

async function toggleOrbFromTitlebar() {
  if (state.settings.enabled === false) {
    showToast({
      type: 'warning',
      title: '软件已暂停',
      message: '请先打开总开关，再切换游戏小窗。',
    });
    return;
  }
  try {
    const visible = await window.cs2Assistant.toggleOrb();
    showToast({
      type: 'success',
      title: visible ? '游戏小窗已显示' : '游戏小窗已隐藏',
      message: visible ? '游戏小窗已恢复显示。' : '游戏小窗已临时隐藏。',
    });
  } catch (error) {
    showToast({
      type: 'error',
      title: '游戏小窗切换失败',
      message: '没有成功切换游戏小窗状态。',
      detail: error.message,
    });
  }
}

function setButtonBusy(button, text, disabled = true) {
  if (!button) return;
  button.textContent = text;
  button.disabled = disabled;
  button.classList.toggle('is-busy', Boolean(disabled));
}

async function toggleTheme(event) {
  const nextTheme = state.settings.theme === 'light' ? 'dark' : 'light';
  const previousTheme = state.settings.theme;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const applyNextTheme = () => {
    state.settings.theme = nextTheme;
    applyTheme(nextTheme);
  };

  const supportsViewTransition = typeof document.startViewTransition === 'function'
    && !state.settings.lowPerformanceMode;

  try {
    if (supportsViewTransition) {
      const transition = document.startViewTransition(applyNextTheme);
      await transition.ready;
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 1120,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
      await transition.finished;
    } else {
      applyNextTheme();
    }

    const settings = await window.cs2Assistant.setTheme(nextTheme);
    state.settings = settings;
    renderSettings();
  } catch (error) {
    state.settings.theme = previousTheme;
    applyTheme(previousTheme);
    showToast({
      type: 'error',
      title: '主题切换失败',
      message: '没有成功保存主题设置。',
      detail: error.message,
    });
  }
}

function showToast({ type = 'info', title = '提示', message = '', detail = '' }) {
  const iconMap = {
    success: '✓',
    warning: '!',
    error: '×',
    info: 'i',
  };
  const toast = document.createElement('article');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__icon">${iconMap[type] || iconMap.info}</div>
    <div class="toast__body">
      <strong></strong>
      <p></p>
      ${detail ? '<pre></pre>' : ''}
    </div>
    <button class="toast__close" aria-label="关闭通知">×</button>
  `;

  toast.querySelector('strong').textContent = title;
  toast.querySelector('p').textContent = message;
  const detailNode = toast.querySelector('pre');
  if (detailNode) detailNode.textContent = detail;

  const close = () => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 180);
  };
  toast.querySelector('.toast__close').addEventListener('click', close);
  elements.toastStack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(close, detail ? 7200 : 4600);
}
