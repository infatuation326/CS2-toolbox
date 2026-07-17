// Electron 主进程负责窗口生命周期、GSI 数据处理和系统级能力。
const { app, BrowserWindow, ipcMain, dialog, shell, screen, clipboard } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { execFile, execFileSync } = require('child_process');

const isWindows = process.platform === 'win32';
const rendererPath = path.join(__dirname, '..', 'renderer');
const appIconPath = path.join(rendererPath, 'assets', 'cs2tool-icon-light.png');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const gsiPort = 31982;
const defaultRemoteDataBaseUrl = 'https://raw.githubusercontent.com/infatuation326/cs2-toolbox-data/main';
const remoteDataProxyPrefixes = ['https://gh-proxy.com/'];
const defaultBombDurationSec = 38;
const minBombDurationSec = 35;
const maxBombDurationSec = 45;
const defaultAudioSettings = {
  killSoundVolume: 100,
  duckCs2OnKill: false,
  duckCs2Volume: 35,
  duckCs2DurationMs: 220,
};
const defuseDurationMs = {
  kit: 5000,
  noKit: 10000,
};
const latencyTargets = [
  { id: 'official', label: '官匹延迟', host: 'steamcommunity.com' },
  { id: 'fivee', label: '5E 延迟', host: 'www.5eplay.com' },
  { id: 'perfect', label: '完美延迟', host: 'pvp.wanmei.com' },
];
const proProfiles = [
  {
    id: 'zywoo',
    name: 'ZywOo',
    description: '偏稳的准星和鼠标灵敏度示例。',
    commands: ['sensitivity 2', 'zoom_sensitivity_ratio 1', 'cl_crosshairsize 2', 'cl_crosshairgap -3'],
  },
  {
    id: 'm0nesy',
    name: 'm0NESY',
    description: '适合狙击手思路的基础示例。',
    commands: ['sensitivity 2.3', 'zoom_sensitivity_ratio 1', 'cl_crosshairsize 1.5', 'cl_crosshairgap -4'],
  },
  {
    id: 'niko',
    name: 'NiKo',
    description: '步枪手常见手感方向示例。',
    commands: ['sensitivity 1.35', 'zoom_sensitivity_ratio 1', 'cl_crosshairsize 2', 'cl_crosshairgap -3'],
  },
];
const cs2FontOptions = [
  { id: 'default', label: '默认字体' },
  { id: 'clean', label: '清爽中文' },
  { id: 'compact', label: '紧凑竞技' },
];
const cs2IntroOptions = [
  { id: 'default', label: '默认启动动画' },
  { id: 'skip', label: '跳过启动动画' },
  { id: 'quiet', label: '安静启动' },
];
const steamStatNames = {
  total_kills: '总杀人',
  total_deaths: '总死亡',
  total_wins: '胜场',
  total_rounds_played: '回合数',
  total_matches_played: '局数',
  total_mvps: 'MVP',
  total_damage_done: '总伤害',
};
const accentColorIds = new Set(['green', 'blue', 'amber', 'red', 'violet']);

app.setName('CS2工具盒子');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

const triggerOptions = {
  maps: [
    { label: '炙热沙城 II', value: 'de_dust2' },
    { label: '荒漠迷城', value: 'de_mirage' },
    { label: '炼狱小镇', value: 'de_inferno' },
    { label: '远古遗迹', value: 'de_ancient' },
    { label: '殒命大厦', value: 'de_vertigo' },
    { label: '核子危机', value: 'de_nuke' },
    { label: '死亡游乐园', value: 'de_overpass' },
    { label: '阿努比斯', value: 'de_anubis' },
    { label: '列车停放站', value: 'de_train' },
    { label: '炙热仓库', value: 'de_cache' },
    { label: '办公室', value: 'cs_office' },
    { label: '意大利小镇', value: 'cs_italy' },
  ],
  mapPhase: [
    { label: '热身', value: 'warmup' },
    { label: '比赛中', value: 'live' },
    { label: '中场', value: 'intermission' },
    { label: '结束', value: 'gameover' },
  ],
  roundPhase: [
    { label: '冻结时间', value: 'freezetime' },
    { label: '进行中', value: 'live' },
    { label: '回合结束', value: 'over' },
  ],
  bomb: [
    { label: '已安装', value: 'planted' },
    { label: '已拆除', value: 'defused' },
    { label: '已爆炸', value: 'exploded' },
  ],
  team: [
    { label: 'CT', value: 'CT' },
    { label: 'T', value: 'T' },
  ],
  activity: [
    { label: '游戏中', value: 'playing' },
    { label: '菜单', value: 'menu' },
    { label: '输入文字', value: 'textinput' },
  ],
  boolean: [
    { label: '是', value: 'true' },
    { label: '否', value: 'false' },
  ],
  binaryState: [
    { label: '触发', value: 'active' },
    { label: '结束', value: 'clear' },
  ],
  healthStatus: [
    { label: '满血', value: 'full' },
    { label: '受伤', value: 'hurt' },
    { label: '残血', value: 'critical' },
    { label: '死亡', value: 'dead' },
  ],
  armorStatus: [
    { label: '无甲', value: 'none' },
    { label: '有甲', value: 'armor' },
    { label: '满甲', value: 'full' },
  ],
  kills: [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
  ],
  rounds: Array.from({ length: 30 }, (_item, index) => ({ label: String(index + 1), value: String(index + 1) })),
  countdownPhase: [
    { label: '冻结时间', value: 'freezetime' },
    { label: '进行中', value: 'live' },
    { label: '炸弹倒计时', value: 'bomb' },
    { label: '拆包中', value: 'defuse' },
    { label: '暂停', value: 'paused' },
    { label: '战术暂停', value: 'timeout' },
    { label: '回合结束', value: 'over' },
  ],
  weapons: [
    { label: 'AK-47', value: 'weapon_ak47' },
    { label: 'M4A1-S', value: 'weapon_m4a1_silencer' },
    { label: 'M4A4', value: 'weapon_m4a1' },
    { label: 'AWP', value: 'weapon_awp' },
    { label: 'SSG 08', value: 'weapon_ssg08' },
    { label: 'Desert Eagle', value: 'weapon_deagle' },
    { label: 'USP-S', value: 'weapon_usp_silencer' },
    { label: 'Glock-18', value: 'weapon_glock' },
    { label: 'P250', value: 'weapon_p250' },
    { label: 'Five-SeveN', value: 'weapon_fiveseven' },
    { label: 'Tec-9', value: 'weapon_tec9' },
    { label: 'Galil AR', value: 'weapon_galilar' },
    { label: 'FAMAS', value: 'weapon_famas' },
    { label: 'AUG', value: 'weapon_aug' },
    { label: 'SG 553', value: 'weapon_sg556' },
    { label: 'MAC-10', value: 'weapon_mac10' },
    { label: 'MP9', value: 'weapon_mp9' },
    { label: 'UMP-45', value: 'weapon_ump45' },
    { label: 'P90', value: 'weapon_p90' },
    { label: 'PP-Bizon', value: 'weapon_bizon' },
    { label: 'XM1014', value: 'weapon_xm1014' },
    { label: 'MAG-7', value: 'weapon_mag7' },
    { label: 'Nova', value: 'weapon_nova' },
    { label: 'Negev', value: 'weapon_negev' },
    { label: '燃烧瓶', value: 'weapon_molotov' },
    { label: '燃烧弹', value: 'weapon_incgrenade' },
    { label: '闪光弹', value: 'weapon_flashbang' },
    { label: '烟雾弹', value: 'weapon_smokegrenade' },
    { label: '高爆手雷', value: 'weapon_hegrenade' },
    { label: '诱饵弹', value: 'weapon_decoy' },
    { label: '刀', value: 'weapon_knife' },
    { label: 'C4', value: 'weapon_c4' },
  ],
  weaponCategories: [
    { label: '刀', value: 'knife' },
    { label: '手枪', value: 'pistol' },
    { label: '长枪', value: 'rifle' },
    { label: '狙击枪', value: 'sniper' },
    { label: '冲锋枪', value: 'smg' },
    { label: '霰弹枪', value: 'shotgun' },
    { label: '机枪', value: 'machinegun' },
    { label: '投掷物', value: 'grenade' },
    { label: 'C4', value: 'c4' },
    { label: '其他', value: 'other' },
  ],
  grenades: [
    { label: '闪光弹', value: 'flashbang' },
    { label: '烟雾弹', value: 'smokegrenade' },
    { label: '高爆手雷', value: 'hegrenade' },
    { label: '燃烧瓶', value: 'molotov' },
    { label: '燃烧弹', value: 'incgrenade' },
    { label: '诱饵弹', value: 'decoy' },
  ],
};

const mapUtilityUrls = {
  de_dust2: 'https://www.cs2util.com/zh/dust2',
  de_mirage: 'https://www.cs2util.com/zh/mirage',
  de_inferno: 'https://www.cs2util.com/zh/inferno',
  de_nuke: 'https://www.cs2util.com/zh/nuke',
  de_ancient: 'https://www.cs2util.com/zh/ancient',
  de_train: 'https://www.cs2util.com/zh/train',
  de_cache: 'https://www.cs2util.com/zh/cache',
  de_anubis: 'https://www.cs2util.com/zh/anubis',
  de_overpass: 'https://www.cs2util.com/zh/overpass',
  de_vertigo: 'https://www.cs2util.com/zh/vertigo',
};

function getBundledRendererAssetPath(...segments) {
  const assetPath = path.join(rendererPath, ...segments);
  if (!app.isPackaged) return assetPath;
  return assetPath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
}

const killStreakSoundPaths = {
  1: getBundledRendererAssetPath('assets', 'sounds', 'kill1.mp3'),
  2: getBundledRendererAssetPath('assets', 'sounds', 'kill2.mp3'),
  3: getBundledRendererAssetPath('assets', 'sounds', 'kill3.mp3'),
  4: getBundledRendererAssetPath('assets', 'sounds', 'kill4.mp3'),
  5: getBundledRendererAssetPath('assets', 'sounds', 'kill5.mp3'),
};

const celestialSoldierSoundPaths = {
  1: getBundledRendererAssetPath('assets', 'sounds', 'zjkill1.mp3'),
  2: getBundledRendererAssetPath('assets', 'sounds', 'zjkill2.mp3'),
  3: getBundledRendererAssetPath('assets', 'sounds', 'zjkill3.mp3'),
  4: getBundledRendererAssetPath('assets', 'sounds', 'zjkill4.mp3'),
  5: getBundledRendererAssetPath('assets', 'sounds', 'zjkill5.mp3'),
};

const killStreakSoundPacks = [
  {
    id: 'valorant-champions-2021',
    name: '2021年冠军',
    source: 'official',
    filePathByValue: killStreakSoundPaths,
  },
  {
    id: 'celestial-soldier',
    name: '天界神兵',
    source: 'official',
    filePathByValue: celestialSoldierSoundPaths,
  },
];

const killSoundStreakKeys = ['1', '2', '3', '4', '5'];

const gsiCatalog = [
  { id: 'provider.name', group: '基础', label: 'Provider 名称', path: ['provider', 'name'], triggerable: false },
  { id: 'provider.appid', group: '基础', label: '游戏 AppID', path: ['provider', 'appid'], triggerable: false },
  { id: 'provider.version', group: '基础', label: '游戏版本', path: ['provider', 'version'], triggerable: false },
  { id: 'provider.steamid', group: '基础', label: 'SteamID', path: ['provider', 'steamid'], triggerable: false },
  { id: 'provider.timestamp', group: '基础', label: '信号时间戳', path: ['provider', 'timestamp'], triggerable: false },
  { id: 'map.name', group: '地图', label: '地图名称', path: ['map', 'name'], triggerable: true, options: triggerOptions.maps },
  { id: 'map.mode', group: '地图', label: '游戏模式', path: ['map', 'mode'], triggerable: false },
  { id: 'map.phase', group: '地图', label: '地图阶段', path: ['map', 'phase'], triggerable: true, options: triggerOptions.mapPhase },
  { id: 'map.round', group: '地图', label: '回合数', path: ['map', 'round'], triggerable: true, options: triggerOptions.rounds },
  { id: 'map.team_ct.score', group: '地图', label: 'CT 分数', path: ['map', 'team_ct', 'score'], triggerable: false },
  { id: 'map.team_t.score', group: '地图', label: 'T 分数', path: ['map', 'team_t', 'score'], triggerable: false },
  { id: 'round.phase', group: '回合', label: '回合阶段', path: ['round', 'phase'], triggerable: true, options: triggerOptions.roundPhase },
  { id: 'round.bomb', group: '回合', label: '回合炸弹状态', path: ['round', 'bomb'], triggerable: true, options: triggerOptions.bomb },
  { id: 'round.win_team', group: '回合', label: '胜利阵营', path: ['round', 'win_team'], triggerable: true, options: triggerOptions.team },
  { id: 'player.name', group: '玩家', label: '玩家名称', path: ['player', 'name'], triggerable: false },
  { id: 'player.steamid', group: '玩家', label: '玩家 SteamID', path: ['player', 'steamid'], triggerable: false },
  { id: 'player.team', group: '玩家', label: '玩家阵营', path: ['player', 'team'], triggerable: true, options: triggerOptions.team },
  { id: 'player.activity', group: '玩家', label: '玩家状态', path: ['player', 'activity'], triggerable: true, options: triggerOptions.activity },
  { id: 'player.observer_slot', group: '玩家', label: '观察者编号', path: ['player', 'observer_slot'], triggerable: false },
  { id: 'player.event.death', group: '玩家事件', label: '玩家死亡', resolver: getPlayerDeathState, triggerable: true, options: [{ label: '死亡', value: 'dead' }] },
  { id: 'player.event.flashed', group: '受击状态', label: '被闪光弹闪到', resolver: payload => getNumericEffectState(payload, 'flashed'), triggerable: true, options: triggerOptions.binaryState },
  { id: 'player.event.burning', group: '受击状态', label: '被火烧到', resolver: payload => getNumericEffectState(payload, 'burning'), triggerable: true, options: triggerOptions.binaryState },
  { id: 'player.event.smoked', group: '受击状态', label: '进入烟雾', resolver: payload => getNumericEffectState(payload, 'smoked'), triggerable: true, options: triggerOptions.binaryState },
  { id: 'player.event.health_status', group: '玩家状态', label: '血量状态', resolver: getHealthStatus, triggerable: true, options: triggerOptions.healthStatus },
  { id: 'player.event.armor_status', group: '玩家状态', label: '护甲状态', resolver: getArmorStatus, triggerable: true, options: triggerOptions.armorStatus },
  { id: 'player.state.health', group: '玩家状态', label: '血量', path: ['player', 'state', 'health'], triggerable: false },
  { id: 'player.state.armor', group: '玩家状态', label: '护甲', path: ['player', 'state', 'armor'], triggerable: false },
  { id: 'player.state.helmet', group: '玩家状态', label: '头盔', path: ['player', 'state', 'helmet'], triggerable: false },
  { id: 'player.state.flashed', group: '玩家状态', label: '闪光时间', path: ['player', 'state', 'flashed'], triggerable: false },
  { id: 'player.state.smoked', group: '玩家状态', label: '烟雾状态', path: ['player', 'state', 'smoked'], triggerable: false },
  { id: 'player.state.burning', group: '玩家状态', label: '燃烧状态', path: ['player', 'state', 'burning'], triggerable: false },
  { id: 'player.state.money', group: '玩家状态', label: '金钱', path: ['player', 'state', 'money'], triggerable: false },
  { id: 'player.state.defusekit', group: '玩家状态', label: '是否有拆包钳', path: ['player', 'state', 'defusekit'], triggerable: true, options: triggerOptions.boolean },
  { id: 'player.state.round_kills', group: '玩家状态', label: '本回合击杀', path: ['player', 'state', 'round_kills'], triggerable: true, options: triggerOptions.kills },
  { id: 'player.state.round_killhs', group: '玩家状态', label: '本回合爆头', path: ['player', 'state', 'round_killhs'], triggerable: true, options: triggerOptions.kills },
  { id: 'player.state.equip_value', group: '玩家状态', label: '装备价值', path: ['player', 'state', 'equip_value'], triggerable: false },
  { id: 'player.match_stats.kills', group: '比赛数据', label: '总击杀', path: ['player', 'match_stats', 'kills'], triggerable: false },
  { id: 'player.match_stats.assists', group: '比赛数据', label: '助攻', path: ['player', 'match_stats', 'assists'], triggerable: false },
  { id: 'player.match_stats.deaths', group: '比赛数据', label: '死亡', path: ['player', 'match_stats', 'deaths'], triggerable: false },
  { id: 'player.match_stats.mvps', group: '比赛数据', label: 'MVP', path: ['player', 'match_stats', 'mvps'], triggerable: false },
  { id: 'player.match_stats.score', group: '比赛数据', label: '分数', path: ['player', 'match_stats', 'score'], triggerable: false },
  { id: 'player.weapons.active', group: '武器', label: '当前武器', resolver: getActiveWeaponName, triggerable: true, options: triggerOptions.weapons },
  { id: 'player.weapons.category', group: '武器', label: '当前武器类型', resolver: getActiveWeaponCategory, triggerable: true, options: triggerOptions.weaponCategories },
  { id: 'player.weapons.grenade', group: '投掷物', label: '拿出/投掷道具', resolver: getActiveGrenadeName, triggerable: true, options: triggerOptions.grenades },
  { id: 'allgrenades.flashbang.count', group: '投掷物', label: '场上闪光弹变化', resolver: payload => countGrenadesByName(payload, 'flashbang'), triggerable: true, options: [] },
  { id: 'allgrenades.smokegrenade.count', group: '投掷物', label: '场上烟雾弹变化', resolver: payload => countGrenadesByName(payload, 'smokegrenade'), triggerable: true, options: [] },
  { id: 'allgrenades.hegrenade.count', group: '投掷物', label: '场上高爆手雷变化', resolver: payload => countGrenadesByName(payload, 'hegrenade'), triggerable: true, options: [] },
  { id: 'allgrenades.fire.count', group: '投掷物', label: '场上燃烧物变化', resolver: payload => countGrenadesByName(payload, 'fire'), triggerable: true, options: [] },
  { id: 'allgrenades.decoy.count', group: '投掷物', label: '场上诱饵弹变化', resolver: payload => countGrenadesByName(payload, 'decoy'), triggerable: true, options: [] },
  { id: 'bomb.state', group: '炸弹', label: '炸弹状态', path: ['bomb', 'state'], triggerable: true, options: triggerOptions.bomb },
  { id: 'phase_countdowns.phase', group: '计时', label: '计时阶段', path: ['phase_countdowns', 'phase'], triggerable: true, options: triggerOptions.countdownPhase },
  { id: 'phase_countdowns.phase_ends_in', group: '计时', label: '阶段剩余时间', path: ['phase_countdowns', 'phase_ends_in'], triggerable: false },
  { id: 'allplayers.count', group: '全局', label: '玩家数量', resolver: payload => countObjectKeys(payload.allplayers), triggerable: false },
  { id: 'allgrenades.count', group: '全局', label: '投掷物数量', resolver: payload => countObjectKeys(payload.allgrenades), triggerable: false },
];

const officialPresets = [
  {
    id: 'death-douyin',
    name: '死亡自动播放抖音',
    description: '当你死亡的时候，自动打开抖音当瘤子，下回合会自动回来',
    rule: {
      source: 'preset',
      presetId: 'death-douyin',
      name: '死亡自动播放抖音',
      description: '当你死亡的时候，自动打开抖音当瘤子，下回合会自动回来',
      eventId: 'player.event.death',
      mode: 'equals',
      value: 'dead',
      cooldownSec: 3,
      openUrl: {
        enabled: true,
        url: 'https://www.douyin.com/?recommend=1',
        closeOnRoundEnd: true,
      },
      playSound: { enabled: false, filePath: '' },
      openFile: { enabled: false, filePath: '' },
      returnGame: {
        enabled: false,
        onRoundEnd: true,
      },
    },
  },
  {
    id: 'warmup-map-utility',
    name: '热身时间来看些道具点位',
    description: '临时抱佛脚大法！',
    rule: {
      source: 'preset',
      presetId: 'warmup-map-utility',
      name: '热身时间来看些道具点位',
      description: '临时抱佛脚大法！',
      eventId: 'map.name',
      mode: 'change',
      value: '',
      cooldownSec: 3,
      triggerOnInitialValue: true,
      triggerOnMapWarmup: true,
      triggerOncePerMap: true,
      openUrl: {
        enabled: true,
        url: '',
        urlByValue: mapUtilityUrls,
        closeOnBuyPhase: true,
      },
      playSound: { enabled: false, filePath: '' },
      openFile: { enabled: false, filePath: '' },
      returnGame: {
        enabled: false,
        onBuyPhase: true,
      },
    },
  },
  {
    id: 'kill-streak-sounds',
    name: '击杀音效',
    description: '每回合 1-5 杀自动播放不同击杀音效，超过 5 杀继续播放 5 杀音效。',
    soundPacks: killStreakSoundPacks.map(({ filePathByValue, ...pack }) => ({ ...pack, editable: false })),
    rule: {
      source: 'preset',
      presetId: 'kill-streak-sounds',
      name: '击杀音效',
      description: '每回合 1-5 杀自动播放不同击杀音效，超过 5 杀继续播放 5 杀音效。',
      eventId: 'player.state.round_kills',
      mode: 'change',
      value: '',
      cooldownSec: 0,
      openUrl: { enabled: false, url: '' },
      playSound: {
        enabled: true,
        filePath: '',
        filePathByValue: killStreakSoundPacks[0].filePathByValue,
        soundPackId: killStreakSoundPacks[0].id,
        soundPackName: killStreakSoundPacks[0].name,
        useKillStreak: true,
      },
      openFile: { enabled: false, filePath: '' },
      returnGame: {
        enabled: false,
        onRoundEnd: false,
      },
    },
  },
  {
    id: 'event-soundboard',
    name: '音效自定义',
    description: '自己添加多个事件音效，例如死亡、回合开始/结束、切刀、切手枪、切长枪和切道具。',
    configurable: true,
    configType: 'event-sounds',
    rule: {
      source: 'preset',
      presetId: 'event-soundboard',
      name: '音效自定义',
      description: '自己添加多个事件音效，例如死亡、回合开始/结束、切刀、切手枪、切长枪和切道具。',
      eventId: 'player.event.death',
      mode: 'equals',
      value: 'dead',
      cooldownSec: 1,
      openUrl: { enabled: false, url: '' },
      playSound: { enabled: false, filePath: '' },
      openFile: { enabled: false, filePath: '' },
      returnGame: { enabled: false, onRoundEnd: false },
      eventSoundboard: true,
    },
  },
];

let mainWindow;
let orbWindow;
let monitorOverlayWindow;
let floatingMenuWindow;
let gsiServer;
let settings;
let serverStatus = { running: false, port: gsiPort, error: null };
let runtimeStatus = { gameRunning: false, gameProcess: 'cs2.exe', checkedAt: null, error: null };
let lastState = createInitialGameState();
let bombState = createInitialBombState();
let lastGsiPayload = null;
const recentActionLogs = [];
const customTriggerLastRunAt = new Map();
const managedWebWindows = new Map();
const managedWebContentIds = new Set();
const guardedManagedWebSessions = new WeakSet();
const customTriggerOnceKeys = new Set();
let killStreakCount = 0;
const soundFileExistsCache = new Map();
let cs2AudioDuckingActive = false;
let pendingCustomSoundPacks = [];

const monitorOverlayItemIds = new Set([
  'fps',
  'cpuUsage',
  'gpuUsage',
  'gpuTemp',
  'cpuTemp',
  'vram',
  'gpuPower',
  'gpuVoltage',
]);

const monitorOverlayColorIds = new Set(['green', 'blue', 'amber', 'white', 'red']);
const monitorOverlayMinWidth = 260;
const monitorOverlayMaxWidth = 520;
const monitorOverlayMinHeight = 54;
const monitorOverlayMaxHeight = 520;

const orbTextModeIds = new Set(['auto', 'status', 'fps', 'health', 'armor', 'roundKills', 'roundTime', 'bombTime', 'c4', 'map']);
const orbRingModeIds = new Set(['auto', 'bombTime', 'roundTime', 'health', 'armor', 'none']);
const orbMinSize = 80;
const orbMaxSize = 128;
const orbWindowPadding = 18;
const backgroundModeIds = new Set(['none', 'official', 'custom']);
const backgroundPresetIds = new Set(['cs2-classic']);
const officialBackgroundPresets = [
  {
    id: 'cs2-classic',
    name: 'CS2经典背景',
    file: 'assets/backgrounds/cs2-classic.jpg',
  },
];

function normalizeBackgroundSettings(value = {}) {
  const mode = backgroundModeIds.has(value.mode) ? value.mode : 'none';
  const presetId = backgroundPresetIds.has(value.presetId) ? value.presetId : 'cs2-classic';
  return {
    mode,
    presetId,
    customImagePath: String(value.customImagePath || ''),
    brightness: Math.round(clampNumber(value.brightness, 45, 120, 82)),
    blur: Math.round(clampNumber(value.blur, 0, 24, 0)),
    panelOpacity: Math.round(clampNumber(value.panelOpacity, 58, 100, 92)),
  };
}

function getBackgroundClientSettings() {
  const background = normalizeBackgroundSettings(settings?.background || {});
  const preset = officialBackgroundPresets.find(item => item.id === background.presetId) || officialBackgroundPresets[0];
  const customExists = background.customImagePath && fs.existsSync(background.customImagePath);
  return {
    ...background,
    presets: officialBackgroundPresets.map(item => ({ id: item.id, name: item.name, file: item.file })),
    officialImage: preset.file,
    customImageUrl: customExists ? pathToFileURL(background.customImagePath).toString() : '',
  };
}

function normalizeOrbSettings(value = {}) {
  return {
    x: Number.isFinite(value.x) ? value.x : null,
    y: Number.isFinite(value.y) ? value.y : null,
    visible: value.visible !== false,
    size: Math.round(clampNumber(value.size, orbMinSize, orbMaxSize, 92)),
    textMode: orbTextModeIds.has(value.textMode) ? value.textMode : 'auto',
    ringMode: orbRingModeIds.has(value.ringMode) ? value.ringMode : 'auto',
  };
}

function resizeOrbWindow() {
  if (!orbWindow || orbWindow.isDestroyed()) return;
  const orbSettings = normalizeOrbSettings(settings.orb || {});
  const size = orbSettings.size + orbWindowPadding * 2;
  const [width, height] = orbWindow.getSize();
  if (width !== size || height !== size) {
    orbWindow.setSize(size, size);
  }
}

function normalizeMonitorOverlaySettings(value = {}) {
  const items = Array.isArray(value.items)
    ? value.items.filter(item => monitorOverlayItemIds.has(item))
    : [];
  return {
    x: Number.isFinite(value.x) ? value.x : null,
    y: Number.isFinite(value.y) ? value.y : null,
    visible: Boolean(value.visible),
    color: monitorOverlayColorIds.has(value.color) ? value.color : 'green',
    opacity: clampNumber(value.opacity, 0.45, 1, 0.86),
    compact: Boolean(value.compact),
    items: items.length ? items : ['cpuUsage', 'gpuUsage', 'gpuTemp', 'vram'],
  };
}

function getMonitorOverlayDefaultSize(overlaySettings = normalizeMonitorOverlaySettings()) {
  const itemCount = Math.max(1, overlaySettings.items.length);
  const rowHeight = overlaySettings.compact ? 17 : 21;
  const chromeHeight = overlaySettings.compact ? 28 : 32;
  return {
    width: 280,
    height: Math.min(monitorOverlayMaxHeight, Math.max(monitorOverlayMinHeight, chromeHeight + itemCount * rowHeight)),
  };
}

function createInitialGameState() {
  return {
    connected: false,
    phase: 'waiting',
    playerTeam: null,
    hasDefuseKit: false,
    health: null,
    armor: null,
    roundKills: 0,
    roundKillHs: 0,
    phaseEndsIn: null,
    activeWeapon: '',
    mapName: '',
    mapPhase: '',
    activity: '',
    bombPlantedAt: null,
    lastPayloadAt: null,
  };
}

function createInitialBombState() {
  const bombDurationMs = getBombDurationMs();
  return {
    active: false,
    remainingMs: bombDurationMs,
    progress: 1,
    isCt: false,
    hasDefuseKit: false,
    dangerMs: defuseDurationMs.noKit,
    danger: false,
    plantedAt: null,
    phase: 'waiting',
  };
}

function normalizeBombDurationSec(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return defaultBombDurationSec;
  return Math.max(minBombDurationSec, Math.min(maxBombDurationSec, number));
}

function normalizeAccentColor(value) {
  return accentColorIds.has(value) ? value : 'green';
}

function normalizeRemoteDataBaseUrl(value) {
  const url = String(value || defaultRemoteDataBaseUrl).trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString().replace(/\/+$/, '') : defaultRemoteDataBaseUrl;
  } catch {
    return defaultRemoteDataBaseUrl;
  }
}

function normalizeSponsorList(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => ({
      name: String(item?.name || '').trim().slice(0, 40),
      message: String(item?.message || '').trim().slice(0, 90),
      enabled: item?.enabled !== false,
    }))
    .filter(item => item.enabled && item.name)
    .map(({ enabled, ...item }) => item);
}

function normalizeNoticeList(value = []) {
  const types = new Set(['info', 'success', 'warning', 'error']);
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      const id = String(item?.id || '').trim().slice(0, 80);
      const title = String(item?.title || '').trim().slice(0, 48);
      const message = String(item?.message || '').trim().slice(0, 140);
      const notice = {
        id,
        title,
        message,
        detail: String(item?.detail || '').trim().slice(0, 360),
        type: types.has(item?.type) ? item.type : 'info',
        popup: item?.popup !== false,
        enabled: item?.enabled !== false,
      };
      const revision = crypto
        .createHash('sha256')
        .update([notice.id, notice.type, notice.title, notice.message, notice.detail, notice.popup].join('\0'))
        .digest('hex')
        .slice(0, 16);
      return { ...notice, seenKey: `${notice.id}@${revision}` };
    })
    .filter(item => item.enabled && item.id && item.title && item.message)
    .map(({ enabled, ...item }) => item);
}

function normalizeRemoteDataSettings(value = {}) {
  const seenNoticeIds = Array.isArray(value.seenNoticeIds)
    ? value.seenNoticeIds.map(item => String(item || '').trim()).filter(Boolean).slice(-120)
    : [];
  return {
    baseUrl: normalizeRemoteDataBaseUrl(value.baseUrl),
    sponsors: normalizeSponsorList(value.sponsors),
    notices: normalizeNoticeList(value.notices),
    seenNoticeIds,
    fetchedAt: Number.isFinite(Number(value.fetchedAt)) ? Number(value.fetchedAt) : null,
    error: String(value.error || '').slice(0, 180),
  };
}

function getBombDurationMs() {
  return normalizeBombDurationSec(settings?.bombDurationSec) * 1000;
}

function normalizeAudioSettings(value = {}) {
  return {
    killSoundVolume: Math.round(clampNumber(value.killSoundVolume, 40, 150, defaultAudioSettings.killSoundVolume)),
    duckCs2OnKill: Boolean(value.duckCs2OnKill),
    duckCs2Volume: Math.round(clampNumber(value.duckCs2Volume, 15, 65, defaultAudioSettings.duckCs2Volume)),
    duckCs2DurationMs: Math.round(clampNumber(value.duckCs2DurationMs, 120, 500, defaultAudioSettings.duckCs2DurationMs)),
  };
}

function getDefaultSettings() {
  return {
    enabled: true,
    theme: 'light',
    accentColor: 'green',
    background: normalizeBackgroundSettings(),
    bombDurationSec: defaultBombDurationSec,
    cs2Path: '',
    cfgInstalled: false,
    cfgPath: '',
    cfgPaths: [],
    setupGuideSeen: false,
    orb: normalizeOrbSettings({
      x: null,
      y: null,
      visible: true,
      size: 92,
      textMode: 'auto',
      ringMode: 'auto',
    }),
    monitorOverlay: normalizeMonitorOverlaySettings(),
    lowPerformanceMode: false,
    launchAtStartup: false,
    audio: {
      ...defaultAudioSettings,
    },
    toolbox: {
      demoDir: '',
      proProfileId: '',
      cs2Font: 'default',
      cs2Intro: 'default',
    },
    steam: {
      apiKey: '',
      steamId: '',
    },
    remoteData: normalizeRemoteDataSettings(),
    onboarding: {
      completed: false,
    },
    customActions: {
      enabled: true,
      rules: [],
      soundPacks: [],
      eventSounds: [],
    },
  };
}

function normalizeCfgPaths(value = []) {
  return uniquePaths(Array.isArray(value) ? value.map(item => String(item || '').trim()) : []);
}

function loadSettings() {
  try {
    if (!fs.existsSync(settingsPath)) {
      return getDefaultSettings();
    }
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const loaded = {
      ...getDefaultSettings(),
      ...saved,
      orb: normalizeOrbSettings({
        ...getDefaultSettings().orb,
        ...(saved.orb || {}),
      }),
      monitorOverlay: normalizeMonitorOverlaySettings(saved.monitorOverlay || {}),
      onboarding: {
        ...getDefaultSettings().onboarding,
        ...(saved.onboarding || {}),
      },
      toolbox: {
        ...getDefaultSettings().toolbox,
        ...(saved.toolbox || {}),
      },
      steam: {
        ...getDefaultSettings().steam,
        ...(saved.steam || {}),
      },
      background: normalizeBackgroundSettings(saved.background || {}),
      remoteData: normalizeRemoteDataSettings(saved.remoteData || {}),
      audio: normalizeAudioSettings(saved.audio || {}),
      customActions: {
        ...normalizeCustomActions(saved.customActions),
      },
    };
    loaded.bombDurationSec = normalizeBombDurationSec(loaded.bombDurationSec);
    loaded.accentColor = normalizeAccentColor(loaded.accentColor);
    loaded.cfgPaths = normalizeCfgPaths([
      ...(saved.cfgPaths || []),
      saved.cfgPath || '',
    ]);
    loaded.cfgPath = loaded.cfgPaths[0] || String(loaded.cfgPath || '');
    loaded.setupGuideSeen = Boolean(saved.setupGuideSeen);
    return loaded;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return getDefaultSettings();
  }
}

function saveSettings() {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

function applyStartupSetting(enabled) {
  settings.launchAtStartup = Boolean(enabled);
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: settings.launchAtStartup,
      path: process.execPath,
    });
  } else {
    app.setLoginItemSettings({
      openAtLogin: settings.launchAtStartup,
    });
  }
}

function isBlockedWindowShortcut(input) {
  const key = String(input.key || '').toLowerCase();
  const code = String(input.code || '').toLowerCase();
  const hasCtrlOrMeta = Boolean(input.control || input.meta);
  const hasShift = Boolean(input.shift);

  if (key === 'f12' || code === 'f12') return true;
  if (key === 'f11' || code === 'f11') return true;
  if (hasCtrlOrMeta && hasShift && ['i', 'j', 'c'].includes(key)) return true;
  if (hasCtrlOrMeta && key === 'u') return true;
  if (input.alt && key === 'enter') return true;
  return false;
}

function protectWindowForRelease(window) {
  if (typeof window.setFullScreenable === 'function') {
    window.setFullScreenable(false);
  }
  window.webContents.closeDevTools();
  window.webContents.on('context-menu', event => {
    event.preventDefault();
  });
  window.webContents.on('devtools-opened', () => {
    window.webContents.closeDevTools();
  });
  window.webContents.on('did-finish-load', () => {
    window.webContents.insertCSS('*{-webkit-user-select:none!important;user-select:none!important;}').catch(() => {});
  });
  window.webContents.on('before-input-event', (event, input) => {
    if (isBlockedWindowShortcut(input)) {
      event.preventDefault();
    }
  });
  window.on('enter-full-screen', () => {
    if (!window.isDestroyed()) window.setFullScreen(false);
  });
  window.on('enter-html-full-screen', () => {
    if (!window.isDestroyed()) window.webContents.executeJavaScript('document.exitFullscreen?.()').catch(() => {});
  });
}

function createFloatingMenuWindow() {
  if (floatingMenuWindow && !floatingMenuWindow.isDestroyed()) return floatingMenuWindow;

  floatingMenuWindow = new BrowserWindow({
    width: 236,
    height: 232,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'floatingMenuPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  protectWindowForRelease(floatingMenuWindow);
  floatingMenuWindow.setAlwaysOnTop(true, 'screen-saver');
  floatingMenuWindow.loadFile(path.join(rendererPath, 'floatingMenu.html'));
  floatingMenuWindow.on('blur', () => {
    if (floatingMenuWindow && !floatingMenuWindow.isDestroyed()) floatingMenuWindow.hide();
  });
  floatingMenuWindow.on('closed', () => {
    floatingMenuWindow = null;
  });
  return floatingMenuWindow;
}

function getFloatingMenuItems(source) {
  return [
    {
      id: 'hide-current',
      label: '关闭显示',
      hint: source === 'monitor' ? '关闭监控悬浮窗' : '关闭悬浮球',
    },
    { id: 'show-main', label: '显示软件页面', hint: '打开 CS2工具盒子主窗口' },
  ];
}

function getFloatingMenuBounds(point, height) {
  const width = 210;
  const display = screen.getDisplayNearestPoint(point);
  const area = display.workArea;
  const x = Math.min(Math.max(point.x, area.x + 8), area.x + area.width - width - 8);
  const y = Math.min(Math.max(point.y, area.y + 8), area.y + area.height - height - 8);
  return { x: Math.round(x), y: Math.round(y), width, height };
}

function showFloatingWindowMenu(source, point) {
  if (!['orb', 'monitor'].includes(source)) return false;
  const menu = createFloatingMenuWindow();
  const items = getFloatingMenuItems(source);
  const height = 58 + items.length * 48;
  menu.setBounds(getFloatingMenuBounds(point, height), false);

  const payload = {
    source,
    title: '快捷操作',
    items,
    settings: {
      theme: settings.theme || 'light',
      accentColor: normalizeAccentColor(settings.accentColor),
    },
  };

  const openMenu = () => {
    if (!floatingMenuWindow || floatingMenuWindow.isDestroyed()) return;
    floatingMenuWindow.webContents.send('floating-menu:open', payload);
    floatingMenuWindow.show();
    floatingMenuWindow.focus();
  };

  if (menu.webContents.isLoading()) {
    menu.webContents.once('did-finish-load', openMenu);
  } else {
    openMenu();
  }
  return true;
}

function bindFloatingContextMenu(window, source) {
  window.webContents.on('context-menu', (event, params) => {
    event.preventDefault();
    if (!window || window.isDestroyed()) return;
    const bounds = window.getBounds();
    showFloatingWindowMenu(source, {
      x: bounds.x + Math.round(params.x || 0),
      y: bounds.y + Math.round(params.y || 0),
    });
  });
}

function moveFloatingWindowBy(sender, delta = {}) {
  const target = BrowserWindow.fromWebContents(sender);
  if (!target || target.isDestroyed()) return false;
  const isFloatingWindow = target === orbWindow || target === monitorOverlayWindow;
  if (!isFloatingWindow) return false;

  const dx = Math.max(-80, Math.min(80, Math.round(Number(delta.dx) || 0)));
  const dy = Math.max(-80, Math.min(80, Math.round(Number(delta.dy) || 0)));
  if (!dx && !dy) return true;

  const [x, y] = target.getPosition();
  target.setPosition(x + dx, y + dy);
  return true;
}

function setOrbVisibleFromMenu(visible) {
  settings.orb = normalizeOrbSettings({
    ...(settings.orb || {}),
    visible: Boolean(visible),
  });
  saveSettings();
  if (orbWindow && !orbWindow.isDestroyed()) {
    resizeOrbWindow();
    settings.enabled !== false && settings.orb.visible ? orbWindow.show() : orbWindow.hide();
  }
  broadcast('settings:update', settings);
  return settings.orb.visible;
}

function setMonitorOverlayVisibleFromMenu(visible) {
  settings.monitorOverlay = normalizeMonitorOverlaySettings({
    ...(settings.monitorOverlay || {}),
    visible: Boolean(visible),
  });
  saveSettings();
  updateMonitorOverlayVisibility();
  broadcast('settings:update', settings);
  return settings.monitorOverlay.visible;
}

function handleFloatingMenuAction(source, action) {
  if (floatingMenuWindow && !floatingMenuWindow.isDestroyed()) floatingMenuWindow.hide();

  if (action === 'show-main') {
    return showMainWindow();
  }
  if (action === 'hide-current') {
    return source === 'monitor' ? setMonitorOverlayVisibleFromMenu(false) : setOrbVisibleFromMenu(false);
  }
  if (action === 'hide-all') {
    setOrbVisibleFromMenu(false);
    setMonitorOverlayVisibleFromMenu(false);
    return true;
  }
  if (action === 'quit') {
    app.quit();
    return true;
  }
  return false;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    maxWidth: 1200,
    maxHeight: 800,
    resizable: false,
    maximizable: false,
    frame: false,
    title: 'CS2工具盒子',
    titleBarStyle: 'hidden',
    transparent: true,
    backgroundColor: '#00000000',
    icon: appIconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  protectWindowForRelease(mainWindow);
  mainWindow.loadFile(path.join(rendererPath, 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('app:init', getClientState());
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createOrbWindow() {
  settings.orb = normalizeOrbSettings(settings.orb || {});
  const displayBounds = screen.getPrimaryDisplay().workArea;
  const orbSize = settings.orb.size;
  const orbWindowSize = orbSize + orbWindowPadding * 2;
  const x = Number.isFinite(settings.orb.x) ? settings.orb.x : displayBounds.x + displayBounds.width - orbWindowSize - 24;
  const y = Number.isFinite(settings.orb.y) ? settings.orb.y : displayBounds.y + Math.round(displayBounds.height * 0.35);

  orbWindow = new BrowserWindow({
    width: orbWindowSize,
    height: orbWindowSize,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: settings.enabled !== false && settings.orb.visible,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'orbPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  protectWindowForRelease(orbWindow);
  bindFloatingContextMenu(orbWindow, 'orb');
  orbWindow.setAlwaysOnTop(true, 'screen-saver');
  orbWindow.loadFile(path.join(rendererPath, 'orb.html'));
  orbWindow.once('ready-to-show', () => {
    orbWindow.webContents.send('app:init', getClientState());
    orbWindow.webContents.send('bomb:update', bombState);
  });
  orbWindow.on('moved', () => {
    if (!orbWindow) return;
    const [orbX, orbY] = orbWindow.getPosition();
    settings.orb.x = orbX;
    settings.orb.y = orbY;
    saveSettings();
  });
  orbWindow.on('closed', () => {
    orbWindow = null;
  });
}

function createMonitorOverlayWindow() {
  const overlaySettings = normalizeMonitorOverlaySettings(settings.monitorOverlay || {});
  settings.monitorOverlay = overlaySettings;
  const displayBounds = screen.getPrimaryDisplay().workArea;
  const overlaySize = getMonitorOverlayDefaultSize(overlaySettings);
  const x = Number.isFinite(overlaySettings.x) ? overlaySettings.x : displayBounds.x + displayBounds.width - overlaySize.width - 32;
  const y = Number.isFinite(overlaySettings.y) ? overlaySettings.y : displayBounds.y + Math.round(displayBounds.height * 0.18);

  monitorOverlayWindow = new BrowserWindow({
    width: overlaySize.width,
    height: overlaySize.height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: settings.enabled !== false && overlaySettings.visible,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'monitorOverlayPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  protectWindowForRelease(monitorOverlayWindow);
  bindFloatingContextMenu(monitorOverlayWindow, 'monitor');
  monitorOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
  monitorOverlayWindow.loadFile(path.join(rendererPath, 'monitorOverlay.html'));
  monitorOverlayWindow.once('ready-to-show', () => {
    monitorOverlayWindow.webContents.send('app:init', getClientState());
  });
  monitorOverlayWindow.on('moved', () => {
    if (!monitorOverlayWindow) return;
    const [xNext, yNext] = monitorOverlayWindow.getPosition();
    settings.monitorOverlay = normalizeMonitorOverlaySettings({
      ...(settings.monitorOverlay || {}),
      x: xNext,
      y: yNext,
    });
    saveSettings();
  });
  monitorOverlayWindow.on('closed', () => {
    monitorOverlayWindow = null;
  });
}

function startGsiServer() {
  if (gsiServer) return;

  gsiServer = http.createServer((request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(404);
      response.end();
      return;
    }

    let raw = '';
    request.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) request.destroy();
    });
    request.on('end', () => {
      try {
        const payload = JSON.parse(raw || '{}');
        processGsiPayload(payload);
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('OK');
      } catch (error) {
        response.writeHead(400, { 'Content-Type': 'text/plain' });
        response.end('Invalid JSON');
      }
    });
  });

  gsiServer.listen(gsiPort, '127.0.0.1', () => {
    serverStatus = { running: true, port: gsiPort, error: null };
    broadcast('server:status', serverStatus);
  });

  gsiServer.on('error', error => {
    serverStatus = { running: false, port: gsiPort, error: error.message };
    broadcast('server:status', serverStatus);
  });
}

function processGsiPayload(payload) {
  const previousPayload = lastGsiPayload;
  lastGsiPayload = payload;

  const phase = payload.round?.phase || payload.phase_countdowns?.phase || 'live';
  const bombStateFromGsi = payload.bomb?.state || payload.round?.bomb || '';
  const playerTeam = normalizeTeam(payload.player?.team);
  const playerState = payload.player?.state || {};
  const hasDefuseKit = Boolean(payload.player?.state?.defusekit || payload.player?.state?.defuse_kit || payload.player?.match_stats?.defusekit);
  const isBombPlanted = bombStateFromGsi === 'planted' || phase === 'bomb';
  const isBuyPhase = phase === 'freezetime';
  const isRoundReset = ['freezetime', 'over', 'intermission'].includes(phase) || ['defused', 'exploded'].includes(bombStateFromGsi);
  const playerDied = getPlayerDeathState(payload) === 'dead' && getPlayerDeathState(previousPayload) !== 'dead';

  if (payload.map?.phase === 'gameover') {
    customTriggerOnceKeys.clear();
    resetKillStreak();
  }

  lastState = {
    connected: true,
    phase,
    playerTeam,
    hasDefuseKit,
    health: readFiniteNumber(playerState.health),
    armor: readFiniteNumber(playerState.armor),
    roundKills: readFiniteNumber(playerState.round_kills) ?? 0,
    roundKillHs: readFiniteNumber(playerState.round_killhs) ?? 0,
    phaseEndsIn: readFiniteNumber(payload.phase_countdowns?.phase_ends_in),
    activeWeapon: getActiveWeaponName(payload) || '',
    mapName: String(payload.map?.name || ''),
    mapPhase: String(payload.map?.phase || ''),
    activity: String(payload.player?.activity || ''),
    bombPlantedAt: lastState.bombPlantedAt,
    lastPayloadAt: Date.now(),
  };

  if (settings.enabled === false) {
    lastState.bombPlantedAt = null;
    bombState = createInitialBombState();
    bombState.phase = 'paused';
    resetKillStreak();
    broadcast('custom:update', getCustomState());
    broadcast('bomb:update', bombState);
    broadcast('game:update', lastState);
    return;
  }

  processCustomTriggers(payload, previousPayload);
  if (playerDied) resetKillStreak();
  broadcast('custom:update', getCustomState());

  if (isBombPlanted && !bombState.active) {
    lastState.bombPlantedAt = Date.now();
  }

  if (isBuyPhase) {
    closeManagedWebWindowsForBuyPhase();
  }

  if (isRoundReset) {
    resetKillStreak();
    closeManagedWebWindowsForRoundEnd();
    lastState.bombPlantedAt = null;
    bombState = createInitialBombState();
    bombState.phase = phase;
    broadcast('bomb:update', bombState);
    broadcast('game:update', lastState);
    return;
  }

  updateBombState();
  broadcast('game:update', lastState);
}

function normalizeTeam(team) {
  if (!team) return null;
  const value = String(team).toUpperCase();
  if (value === 'CT') return 'CT';
  if (value === 'T') return 'T';
  return value;
}

function countObjectKeys(value) {
  return value && typeof value === 'object' ? Object.keys(value).length : undefined;
}

function countGrenadesByName(payload, expectedName) {
  const grenades = payload?.allgrenades;
  if (!grenades || typeof grenades !== 'object') return 0;
  return Object.values(grenades).filter(grenade => {
    const name = String(grenade?.type || grenade?.name || '').toLowerCase();
    if (!name) return false;
    if (expectedName === 'fire') {
      return name.includes('molotov') || name.includes('incgrenade') || name.includes('inferno') || name.includes('fire');
    }
    return name.includes(expectedName);
  }).length;
}

function getActiveWeaponName(payload) {
  const weapons = payload?.player?.weapons;
  if (!weapons || typeof weapons !== 'object') return undefined;
  const activeWeapon = Object.values(weapons).find(weapon => weapon?.state === 'active');
  return activeWeapon?.name || activeWeapon?.type;
}

function getActiveWeaponCategory(payload) {
  const weaponName = String(getActiveWeaponName(payload) || '');
  if (!weaponName) return undefined;
  if (weaponName.includes('knife') || weaponName === 'knife') return 'knife';
  if (weaponName === 'weapon_c4' || weaponName === 'c4') return 'c4';
  if (['weapon_glock', 'weapon_hkp2000', 'weapon_usp_silencer', 'weapon_p250', 'weapon_deagle', 'weapon_elite', 'weapon_fiveseven', 'weapon_tec9', 'weapon_cz75a', 'weapon_revolver'].includes(weaponName)) return 'pistol';
  if (['weapon_ak47', 'weapon_m4a1', 'weapon_m4a1_silencer', 'weapon_famas', 'weapon_galilar', 'weapon_aug', 'weapon_sg556'].includes(weaponName)) return 'rifle';
  if (['weapon_awp', 'weapon_ssg08', 'weapon_scar20', 'weapon_g3sg1'].includes(weaponName)) return 'sniper';
  if (['weapon_mac10', 'weapon_mp9', 'weapon_mp7', 'weapon_mp5sd', 'weapon_ump45', 'weapon_p90', 'weapon_bizon'].includes(weaponName)) return 'smg';
  if (['weapon_xm1014', 'weapon_mag7', 'weapon_nova', 'weapon_sawedoff'].includes(weaponName)) return 'shotgun';
  if (['weapon_negev', 'weapon_m249'].includes(weaponName)) return 'machinegun';
  if (['weapon_molotov', 'weapon_incgrenade', 'weapon_flashbang', 'weapon_smokegrenade', 'weapon_hegrenade', 'weapon_decoy'].includes(weaponName)) return 'grenade';
  return 'other';
}

function getActiveGrenadeName(payload) {
  const weaponName = String(getActiveWeaponName(payload) || '');
  const grenadeMap = {
    weapon_flashbang: 'flashbang',
    weapon_smokegrenade: 'smokegrenade',
    weapon_hegrenade: 'hegrenade',
    weapon_molotov: 'molotov',
    weapon_incgrenade: 'incgrenade',
    weapon_decoy: 'decoy',
  };
  return grenadeMap[weaponName];
}

function getNumericEffectState(payload, key) {
  const value = Number(payload?.player?.state?.[key]);
  if (!Number.isFinite(value)) return undefined;
  return value > 0 ? 'active' : 'clear';
}

function getHealthStatus(payload) {
  const health = Number(payload?.player?.state?.health);
  if (!Number.isFinite(health)) return undefined;
  if (health <= 0) return 'dead';
  if (health <= 30) return 'critical';
  if (health < 100) return 'hurt';
  return 'full';
}

function getArmorStatus(payload) {
  const armor = Number(payload?.player?.state?.armor);
  if (!Number.isFinite(armor)) return undefined;
  if (armor <= 0) return 'none';
  if (armor >= 100) return 'full';
  return 'armor';
}

function readFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getPlayerDeathState(payload) {
  const health = Number(payload?.player?.state?.health);
  if (!Number.isFinite(health)) return undefined;
  return health <= 0 ? 'dead' : 'alive';
}

function normalizeSteamId(value) {
  return String(value || '').trim();
}

function getProviderSteamId(payload) {
  return normalizeSteamId(payload?.provider?.steamid);
}

function getPlayerSteamId(payload) {
  return normalizeSteamId(payload?.player?.steamid);
}

function isLocalPlayerPayload(payload) {
  const providerSteamId = getProviderSteamId(payload);
  const playerSteamId = getPlayerSteamId(payload);
  return Boolean(providerSteamId && playerSteamId && providerSteamId === playerSteamId);
}

function getLocalPlayerEntry(payload) {
  const providerSteamId = getProviderSteamId(payload);
  if (!providerSteamId || !payload?.allplayers || typeof payload.allplayers !== 'object') return null;
  return payload.allplayers[providerSteamId] || null;
}

function getRoundKillCountFromEntry(entry) {
  const value = Number(entry?.state?.round_kills);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getLocalRoundKillCount(payload) {
  const localEntry = getLocalPlayerEntry(payload);
  if (localEntry) return getRoundKillCountFromEntry(localEntry);
  if (isLocalPlayerPayload(payload)) return getRoundKillCountFromEntry(payload.player);
  return null;
}

function getPathValue(source, item) {
  if (!source) return undefined;
  if (typeof item.resolver === 'function') return item.resolver(source);
  return item.path.reduce((current, key) => current?.[key], source);
}

function normalizeComparableValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatCustomValue(value) {
  if (value === undefined || value === null || value === '') return '未收到';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getCustomCatalog() {
  return gsiCatalog.map(({ resolver, ...item }) => item);
}

function getCustomValues(payload = lastGsiPayload) {
  const values = {};
  for (const item of gsiCatalog) {
    values[item.id] = formatCustomValue(getPathValue(payload, item));
  }
  return values;
}

function getCustomState() {
  return {
    enabled: settings?.customActions?.enabled !== false,
    catalog: getCustomCatalog(),
    values: getCustomValues(),
    rules: settings?.customActions?.rules || [],
    eventSounds: settings?.customActions?.eventSounds || [],
    presets: getCustomPresetsState(),
    recentLogs: recentActionLogs,
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeStringMap(value = {}) {
  return value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [String(key), String(entry)]))
    : {};
}

function createCustomSoundPackId() {
  return `custom-sound-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEventSoundId() {
  return `event-sound-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKillSoundFileMap(value = {}) {
  const normalized = {};
  for (const key of killSoundStreakKeys) {
    normalized[key] = String(value?.[key] || '').trim();
  }
  return normalized;
}

function isCompleteKillSoundFileMap(value = {}) {
  return killSoundStreakKeys.every(key => String(value?.[key] || '').trim());
}

function normalizeCustomSoundPack(pack = {}) {
  return {
    id: String(pack.id || createCustomSoundPackId()),
    name: String(pack.name || '自定义击杀音效').trim().slice(0, 40) || '自定义击杀音效',
    source: 'custom',
    editable: true,
    filePathByValue: normalizeKillSoundFileMap(pack.filePathByValue),
  };
}

function normalizeCustomSoundPacks(value = []) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(normalizeCustomSoundPack)
    .filter(pack => {
      if (seen.has(pack.id) || !isCompleteKillSoundFileMap(pack.filePathByValue)) return false;
      seen.add(pack.id);
      return true;
    });
}

function normalizeEventSoundConfig(config = {}) {
  const item = getTriggerableItem(config.eventId);
  const optionValues = item?.options?.map(option => String(option.value)) || [];
  const selectedValue = String(config.value || '');
  const mode = config.mode === 'change' ? 'change' : 'equals';
  return {
    id: String(config.id || createEventSoundId()),
    name: String(config.name || item?.label || '自定义音效').trim().slice(0, 40) || '自定义音效',
    enabled: config.enabled !== false,
    eventId: item?.id || '',
    mode: mode === 'equals' && !optionValues.length ? 'change' : mode,
    value: optionValues.length && !optionValues.includes(selectedValue) ? optionValues[0] : selectedValue,
    cooldownSec: clampNumber(config.cooldownSec, 0, 600, 1),
    filePath: String(config.filePath || '').trim(),
  };
}

function normalizeEventSoundConfigs(value = []) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map(normalizeEventSoundConfig)
    .filter(config => {
      if (!config.eventId || !config.filePath || seen.has(config.id)) return false;
      seen.add(config.id);
      return true;
    });
}

function getKillSoundPacks(includeFiles = false) {
  const official = killStreakSoundPacks.map(pack => ({
    ...pack,
    source: 'official',
    editable: false,
  }));
  const custom = normalizeCustomSoundPacks(settings?.customActions?.soundPacks || pendingCustomSoundPacks);
  return [...official, ...custom].map(pack => {
    if (includeFiles) return pack;
    const { filePathByValue, ...metadata } = pack;
    return metadata;
  });
}

function getPresetSoundPacks(presetId, includeFiles = false) {
  return presetId === 'kill-streak-sounds' ? getKillSoundPacks(includeFiles) : [];
}

function getCustomPresetsState() {
  return officialPresets.map(({ rule, ...preset }) => {
    const soundPacks = getPresetSoundPacks(preset.id, false);
    return {
      ...preset,
      soundPacks: soundPacks.length ? soundPacks : preset.soundPacks,
    };
  });
}

function normalizeCustomTriggerConfig(config = {}, item = null) {
  const optionValues = item?.options?.map(option => String(option.value)) || [];
  const selectedValue = String(config.value || '');
  const mode = config.mode === 'equals' && optionValues.length ? 'equals' : 'change';
  return {
    enabled: config.enabled === undefined ? true : Boolean(config.enabled),
    mode,
    value: optionValues.length && !optionValues.includes(selectedValue) ? optionValues[0] : selectedValue,
    cooldownSec: clampNumber(config.cooldownSec, 0, 600, 10),
    triggerOnInitialValue: Boolean(config.triggerOnInitialValue),
    triggerOnMapWarmup: Boolean(config.triggerOnMapWarmup),
    triggerOncePerMap: Boolean(config.triggerOncePerMap),
    openUrl: {
      enabled: Boolean(config.openUrl?.enabled),
      url: String(config.openUrl?.url || '').trim(),
      closeOnRoundEnd: Boolean(config.openUrl?.closeOnRoundEnd),
      closeOnBuyPhase: Boolean(config.openUrl?.closeOnBuyPhase),
      urlByValue: normalizeStringMap(config.openUrl?.urlByValue),
    },
    playSound: {
      enabled: Boolean(config.playSound?.enabled),
      filePath: String(config.playSound?.filePath || '').trim(),
      filePathByValue: normalizeStringMap(config.playSound?.filePathByValue),
      soundPackId: String(config.playSound?.soundPackId || ''),
      soundPackName: String(config.playSound?.soundPackName || ''),
      useKillStreak: Boolean(config.playSound?.useKillStreak),
    },
    openFile: {
      enabled: Boolean(config.openFile?.enabled),
      filePath: String(config.openFile?.filePath || '').trim(),
    },
    returnGame: {
      enabled: Boolean(config.returnGame?.enabled),
      onRoundEnd: Boolean(config.returnGame?.onRoundEnd),
      onBuyPhase: Boolean(config.returnGame?.onBuyPhase),
    },
  };
}

function createCustomRuleId(prefix = 'rule') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneRule(rule) {
  return JSON.parse(JSON.stringify(rule || {}));
}

function resetKillStreak() {
  killStreakCount = 0;
}

function cacheSoundFileExists(filePath) {
  const key = String(filePath || '').trim();
  if (!key) return false;
  if (soundFileExistsCache.has(key)) return soundFileExistsCache.get(key);
  const exists = fs.existsSync(key);
  soundFileExistsCache.set(key, exists);
  return exists;
}

function warmConfiguredSoundFiles() {
  soundFileExistsCache.clear();
  for (const rule of settings?.customActions?.rules || []) {
    const playSound = rule.playSound || {};
    if (playSound.filePath) cacheSoundFileExists(playSound.filePath);
    if (playSound.filePathByValue && typeof playSound.filePathByValue === 'object') {
      Object.values(playSound.filePathByValue).forEach(cacheSoundFileExists);
    }
  }
  for (const config of settings?.customActions?.eventSounds || []) {
    cacheSoundFileExists(config.filePath);
  }
}

function getRuleDisplayName(rule = {}) {
  const preset = officialPresets.find(item => item.id === rule.presetId);
  return preset?.name || rule.name || '未命名功能';
}

function addActionLog(rule = {}, actionText = '已触发') {
  recentActionLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: Date.now(),
    ruleId: rule.id || '',
    name: getRuleDisplayName(rule),
    action: actionText,
  });
  recentActionLogs.splice(12);
}

function getOfficialPresetSoundPack(presetId, soundPackId) {
  const packs = getPresetSoundPacks(presetId, true);
  return packs.find(pack => pack.id === soundPackId) || packs[0] || null;
}

function repairOfficialPresetRule(rule) {
  if (rule.source !== 'preset') return rule;
  const preset = officialPresets.find(item => item.id === rule.presetId);
  if (!preset) return rule;
  if (rule.presetId === 'event-soundboard') {
    return {
      ...rule,
      name: preset.rule.name,
      description: preset.rule.description,
      eventSoundboard: true,
      playSound: {
        ...(rule.playSound || {}),
        enabled: false,
      },
    };
  }
  if (rule.presetId !== 'kill-streak-sounds') {
    return {
      ...rule,
      name: preset.rule.name,
      description: preset.rule.description,
    };
  }

  const pack = getOfficialPresetSoundPack(rule.presetId, rule.playSound?.soundPackId);
  if (!pack) return rule;
  return {
    ...rule,
    name: preset.rule.name,
    description: preset.rule.description,
    playSound: {
      ...(rule.playSound || {}),
      enabled: true,
      filePath: '',
      filePathByValue: pack.filePathByValue,
      soundPackId: pack.id,
      soundPackName: pack.name,
      useKillStreak: true,
    },
  };
}

function getTriggerableItem(eventId) {
  return gsiCatalog.find(item => item.id === eventId && item.triggerable)
    || gsiCatalog.find(item => item.triggerable);
}

function normalizeCustomRule(rule = {}) {
  const item = getTriggerableItem(rule.eventId);
  const config = normalizeCustomTriggerConfig(rule, item);
  return repairOfficialPresetRule({
    id: String(rule.id || createCustomRuleId(rule.source === 'preset' ? 'preset' : 'rule')),
    source: rule.source === 'preset' ? 'preset' : 'manual',
    presetId: String(rule.presetId || ''),
    name: String(rule.name || item?.label || '未命名功能').trim().slice(0, 40) || '未命名功能',
    description: String(rule.description || '').trim().slice(0, 120),
    eventId: item?.id || '',
    ...config,
  });
}

function migrateLegacyTriggers(triggers = {}) {
  return Object.entries(triggers)
    .map(([itemId, config]) => {
      const item = getTriggerableItem(itemId);
      if (!item || item.id !== itemId) return null;
      return normalizeCustomRule({
        ...config,
        id: `migrated-${itemId.replace(/[^a-z0-9]+/gi, '-')}`,
        source: 'manual',
        name: item.label,
        description: '从旧版自动功能迁移',
        eventId: itemId,
        enabled: Boolean(config?.enabled),
      });
    })
    .filter(Boolean);
}

function normalizeCustomActions(customActions = {}) {
  const soundPacks = normalizeCustomSoundPacks(customActions.soundPacks);
  const eventSounds = normalizeEventSoundConfigs(customActions.eventSounds);
  const previousPendingSoundPacks = pendingCustomSoundPacks;
  pendingCustomSoundPacks = soundPacks;
  const rules = Array.isArray(customActions.rules)
    ? customActions.rules.map(normalizeCustomRule)
    : migrateLegacyTriggers(customActions.triggers);
  pendingCustomSoundPacks = previousPendingSoundPacks;
  return {
    enabled: customActions.enabled !== false,
    rules,
    soundPacks,
    eventSounds,
  };
}

function shouldRunCustomTrigger(item, config, payload, previousPayload) {
  if (!item.triggerable || !config.enabled) return false;

  const before = normalizeComparableValue(getPathValue(previousPayload, item));
  const after = normalizeComparableValue(getPathValue(payload, item));
  if (!after) return false;

  if (config.triggerOnMapWarmup) {
    const previousPhase = previousPayload?.map?.phase || '';
    const currentPhase = payload?.map?.phase || '';
    const enteredWarmup = currentPhase === 'warmup' && previousPhase !== 'warmup';
    if (!previousPayload) return config.triggerOnInitialValue;
    if (enteredWarmup || before !== after) return true;
  }

  if (!previousPayload) {
    return config.triggerOnInitialValue;
  }

  if (before === after) return false;

  if (config.mode === 'equals') {
    return after === normalizeComparableValue(config.value);
  }

  return true;
}

function getCustomTriggerOnceKey(rule, item, payload) {
  if (!rule.triggerOncePerMap) return '';
  const mapName = normalizeComparableValue(getPathValue(payload, item));
  return mapName ? `${rule.id}:map:${mapName}` : '';
}

function processCustomTriggers(payload, previousPayload) {
  if (settings?.customActions?.enabled === false) return;

  for (const rule of settings?.customActions?.rules || []) {
    if (rule.presetId === 'event-soundboard') continue;
    const item = gsiCatalog.find(entry => entry.id === rule.eventId);
    const config = normalizeCustomRule(rule);
    if (!item || !shouldRunCustomTrigger(item, config, payload, previousPayload)) continue;

    const onceKey = getCustomTriggerOnceKey(config, item, payload);
    if (onceKey && customTriggerOnceKeys.has(onceKey)) continue;

    const now = Date.now();
    const lastRunAt = customTriggerLastRunAt.get(rule.id) || 0;
    if (now - lastRunAt < config.cooldownSec * 1000) continue;

    customTriggerLastRunAt.set(rule.id, now);
    if (onceKey) customTriggerOnceKeys.add(onceKey);
    executeCustomActions(config, payload, item, previousPayload);
  }

  processEventSoundboard(payload, previousPayload);
}

function processEventSoundboard(payload, previousPayload) {
  const customActions = settings?.customActions || {};
  const boardRule = (customActions.rules || []).find(rule => rule.source === 'preset' && rule.presetId === 'event-soundboard' && rule.enabled !== false);
  if (!boardRule) return;

  for (const config of customActions.eventSounds || []) {
    const item = gsiCatalog.find(entry => entry.id === config.eventId);
    if (!item || !shouldRunCustomTrigger(item, {
      enabled: config.enabled,
      mode: config.mode,
      value: config.value,
      triggerOnInitialValue: false,
    }, payload, previousPayload)) continue;

    const now = Date.now();
    const lastRunAt = customTriggerLastRunAt.get(config.id) || 0;
    if (now - lastRunAt < config.cooldownSec * 1000) continue;
    if (!cacheSoundFileExists(config.filePath)) continue;

    customTriggerLastRunAt.set(config.id, now);
    broadcast('custom:play-sound', { ruleId: boardRule.id, itemId: config.eventId, filePath: config.filePath, isKillSound: false });
    addActionLog(boardRule, `${config.name}：播放声音`);
  }
}

function isAllowedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ['http:', 'https:', 'steam:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isManagedWebUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isManagedBrowserRequestUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ['http:', 'https:', 'about:', 'blob:', 'data:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isManagedTopLevelUrl(rawUrl) {
  return rawUrl === 'about:blank' || isManagedWebUrl(rawUrl);
}

function installManagedWebRequestGuard(session) {
  if (!session || guardedManagedWebSessions.has(session)) return;
  guardedManagedWebSessions.add(session);
  session.webRequest.onBeforeRequest((details, callback) => {
    if (!managedWebContentIds.has(details.webContentsId)) {
      callback({ cancel: false });
      return;
    }

    callback({ cancel: !isManagedBrowserRequestUrl(details.url) });
  });
}

function preventExternalManagedNavigation(event, targetUrl, allowEmbeddedUrls = false) {
  const canNavigate = allowEmbeddedUrls
    ? isManagedBrowserRequestUrl(targetUrl)
    : isManagedTopLevelUrl(targetUrl);
  if (!canNavigate) {
    event.preventDefault();
  }
}

function configureManagedWebWindow(webWindow) {
  const webContentsId = webWindow.webContents.id;
  managedWebContentIds.add(webContentsId);
  installManagedWebRequestGuard(webWindow.webContents.session);

  webWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isManagedWebUrl(url)) {
      webWindow.loadURL(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  webWindow.webContents.on('will-navigate', (event, targetUrl) => preventExternalManagedNavigation(event, targetUrl));
  webWindow.webContents.on('will-redirect', (event, targetUrl) => preventExternalManagedNavigation(event, targetUrl));
  webWindow.webContents.on('will-frame-navigate', (event, targetUrl) => preventExternalManagedNavigation(event, targetUrl, true));
  webWindow.webContents.on('destroyed', () => managedWebContentIds.delete(webContentsId));
}

function openManagedWebWindow(rule, url) {
  const current = managedWebWindows.get(rule.id)?.window;
  if (current && !current.isDestroyed()) {
    current.focus();
    current.loadURL(url).catch(() => shell.openExternal(url));
    return;
  }

  const webWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: rule.name,
    autoHideMenuBar: false,
    fullscreen: false,
    icon: appIconPath,
    show: true,
    backgroundColor: '#101114',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });
  protectWindowForRelease(webWindow);
  configureManagedWebWindow(webWindow);
  webWindow.setMenuBarVisibility(true);
  webWindow.maximize();

  managedWebWindows.set(rule.id, {
    window: webWindow,
    closeOnRoundEnd: Boolean(rule.openUrl?.closeOnRoundEnd),
    closeOnBuyPhase: Boolean(rule.openUrl?.closeOnBuyPhase),
    returnGameOnRoundEnd: Boolean(rule.returnGame?.onRoundEnd),
    returnGameOnBuyPhase: Boolean(rule.returnGame?.onBuyPhase),
  });
  webWindow.on('closed', () => managedWebWindows.delete(rule.id));
  webWindow.loadURL(url).catch(() => shell.openExternal(url));
}

function closeManagedWebWindowsByReason(reason) {
  let shouldFocusGame = false;
  for (const [ruleId, entry] of managedWebWindows) {
    const shouldClose = reason === 'buy'
      ? entry.closeOnBuyPhase
      : entry.closeOnRoundEnd;
    shouldFocusGame = shouldFocusGame || (reason === 'buy'
      ? Boolean(entry.returnGameOnBuyPhase)
      : Boolean(entry.returnGameOnRoundEnd));
    if (shouldClose && entry.window && !entry.window.isDestroyed()) {
      entry.window.close();
      managedWebWindows.delete(ruleId);
    }
  }
  if (shouldFocusGame) {
    setTimeout(() => focusGameWindow(), 250);
  }
}

function closeAllManagedWebWindows() {
  for (const [ruleId, entry] of managedWebWindows) {
    if (entry.window && !entry.window.isDestroyed()) {
      entry.window.close();
    }
    managedWebWindows.delete(ruleId);
  }
}

function closeManagedWebWindowsForRoundEnd() {
  closeManagedWebWindowsByReason('round');
}

function closeManagedWebWindowsForBuyPhase() {
  closeManagedWebWindowsByReason('buy');
}

function resolveCustomOpenUrl(rule, payload, item) {
  const currentValue = normalizeComparableValue(getPathValue(payload, item));
  const mappedUrl = currentValue ? rule.openUrl.urlByValue?.[currentValue] : '';
  return String(mappedUrl || rule.openUrl.url || '').trim();
}

function resolveKillStreakSoundKey(payload, previousPayload) {
  const after = getLocalRoundKillCount(payload);
  if (after === null) return '';

  const before = getLocalRoundKillCount(previousPayload) ?? 0;
  if (after <= before) return '';

  killStreakCount = Math.min(5, killStreakCount + Math.max(1, after - before));
  return String(killStreakCount);
}

function resolveCustomSoundPath(rule, payload, item, previousPayload) {
  if (rule.playSound.useKillStreak) {
    const streakKey = resolveKillStreakSoundKey(payload, previousPayload);
    return streakKey ? String(rule.playSound.filePathByValue?.[streakKey] || '').trim() : '';
  }

  const currentValue = normalizeComparableValue(getPathValue(payload, item));
  const mappedPath = currentValue ? rule.playSound.filePathByValue?.[currentValue] : '';
  return String(mappedPath || rule.playSound.filePath || '').trim();
}

function getMainActionSummary(rule = {}) {
  const actions = [];
  if (rule.openUrl?.enabled) actions.push('打开网页');
  if (rule.playSound?.enabled) actions.push(rule.playSound?.useKillStreak ? '播放击杀音效' : '播放声音');
  if (rule.openFile?.enabled) actions.push('打开文件');
  if (rule.returnGame?.enabled || rule.returnGame?.onRoundEnd || rule.returnGame?.onBuyPhase) actions.push('返回游戏');
  return actions.join('、') || '没有动作';
}

function executeCustomActions(rule = normalizeCustomRule(), payload = lastGsiPayload, item = getTriggerableItem(rule.eventId), previousPayload = null) {
  if (settings.enabled === false) return;
  const openUrl = resolveCustomOpenUrl(rule, payload, item);
  const soundPath = resolveCustomSoundPath(rule, payload, item, previousPayload);
  let didSomething = false;
  if (rule.openUrl.enabled && isAllowedUrl(openUrl)) {
    didSomething = true;
    if (isManagedWebUrl(openUrl)) {
      openManagedWebWindow(rule, openUrl);
    } else {
      shell.openExternal(openUrl);
    }
  }

  if (rule.openFile.enabled && rule.openFile.filePath && fs.existsSync(rule.openFile.filePath)) {
    didSomething = true;
    shell.openPath(rule.openFile.filePath);
  }

  if (rule.playSound.enabled && soundPath && cacheSoundFileExists(soundPath)) {
    didSomething = true;
    const isKillSound = isKillSoundRule(rule);
    if (shouldDuckCs2AudioForRule(rule, payload, previousPayload)) {
      duckCs2AudioBriefly();
    }
    broadcast('custom:play-sound', { ruleId: rule.id, itemId: rule.eventId, filePath: soundPath, isKillSound });
  }

  if (rule.returnGame.enabled) {
    didSomething = true;
    focusGameWindow();
  }

  if (didSomething) {
    addActionLog(rule, getMainActionSummary(rule));
  }
}

function shouldDuckCs2AudioForRule(rule, payload, previousPayload) {
  if (!isWindows || settings?.audio?.duckCs2OnKill !== true) return false;
  if (!payload || !previousPayload) return false;
  return isKillSoundRule(rule);
}

function isKillSoundRule(rule) {
  return Boolean(rule.playSound?.useKillStreak || rule.eventId === 'player.state.round_kills');
}

function duckCs2AudioBriefly() {
  if (cs2AudioDuckingActive) return;
  const audioSettings = normalizeAudioSettings(settings?.audio || {});
  const duckLevel = Math.max(0.01, Math.min(1, audioSettings.duckCs2Volume / 100));
  const durationMs = audioSettings.duckCs2DurationMs;
  cs2AudioDuckingActive = true;

  execFile(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      getCs2AudioDuckingScript(),
      'cs2',
      String(duckLevel),
      String(durationMs),
    ],
    { windowsHide: true, timeout: 2500 },
    () => {
      cs2AudioDuckingActive = false;
    },
  );
}

function getCs2AudioDuckingScript() {
  return `
& {
param([string]$ProcessName, [double]$DuckLevel, [int]$DurationMs)
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public enum EDataFlow { eRender = 0 }
public enum ERole { eMultimedia = 1 }

[ComImport]
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumerator {}

[ComImport]
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
  int EnumAudioEndpoints();
  [PreserveSig] int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppDevice);
}

[ComImport]
[Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
  [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IAudioSessionManager2 ppInterface);
}

[ComImport]
[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionManager2 {
  int GetAudioSessionControl();
  int GetSimpleAudioVolume();
  [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator sessionEnum);
}

[ComImport]
[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionEnumerator {
  [PreserveSig] int GetCount(out int count);
  [PreserveSig] int GetSession(int sessionCount, out IAudioSessionControl2 session);
}

[ComImport]
[Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl2 {
  int GetState(out int state);
  int GetDisplayName(out IntPtr displayName);
  int SetDisplayName(string displayName, ref Guid eventContext);
  int GetIconPath(out IntPtr iconPath);
  int SetIconPath(string iconPath, ref Guid eventContext);
  int GetGroupingParam(out Guid groupingId);
  int SetGroupingParam(ref Guid groupingId, ref Guid eventContext);
  int RegisterAudioSessionNotification(IntPtr client);
  int UnregisterAudioSessionNotification(IntPtr client);
  int GetSessionIdentifier(out IntPtr retVal);
  int GetSessionInstanceIdentifier(out IntPtr retVal);
  [PreserveSig] int GetProcessId(out uint processId);
  int IsSystemSoundsSession();
  int SetDuckingPreference(bool optOut);
}

[ComImport]
[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ISimpleAudioVolume {
  [PreserveSig] int SetMasterVolume(float level, ref Guid eventContext);
  [PreserveSig] int GetMasterVolume(out float level);
  [PreserveSig] int SetMute(bool isMuted, ref Guid eventContext);
  [PreserveSig] int GetMute(out bool isMuted);
}

public static class AudioSessionTool {
  public static ISimpleAudioVolume FindVolume(string processName) {
    var enumerator = new MMDeviceEnumerator() as IMMDeviceEnumerator;
    IMMDevice device;
    if (enumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out device) != 0 || device == null) return null;
    Guid iid = typeof(IAudioSessionManager2).GUID;
    IAudioSessionManager2 manager;
    if (device.Activate(ref iid, 23, IntPtr.Zero, out manager) != 0 || manager == null) return null;
    IAudioSessionEnumerator sessions;
    if (manager.GetSessionEnumerator(out sessions) != 0 || sessions == null) return null;
    int count;
    sessions.GetCount(out count);
    for (int i = 0; i < count; i++) {
      IAudioSessionControl2 control;
      if (sessions.GetSession(i, out control) != 0 || control == null) continue;
      uint pid;
      if (control.GetProcessId(out pid) != 0 || pid == 0) continue;
      try {
        var process = Process.GetProcessById((int)pid);
        if (String.Equals(process.ProcessName, processName, StringComparison.OrdinalIgnoreCase)) {
          return control as ISimpleAudioVolume;
        }
      } catch {}
    }
    return null;
  }
}
'@

$volume = [AudioSessionTool]::FindVolume($ProcessName)
if ($null -eq $volume) { exit 2 }
$previous = 1.0
[void]$volume.GetMasterVolume([ref]$previous)
$context = [Guid]::Empty
[void]$volume.SetMasterVolume([single]$DuckLevel, [ref]$context)
Start-Sleep -Milliseconds $DurationMs
[void]$volume.SetMasterVolume([single]$previous, [ref]$context)
}
`;
}

function focusGameWindow() {
  if (!isWindows) return;
  const command = [
    '$ws = New-Object -ComObject WScript.Shell',
    '$titles = @("Counter-Strike 2", "Counter-Strike", "cs2")',
    'foreach ($title in $titles) { if ($ws.AppActivate($title)) { exit 0 } }',
    'exit 1',
  ].join('; ');
  execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true }, () => {});
}

function updateBombState() {
  const plantedAt = lastState.bombPlantedAt;
  const bombDurationMs = getBombDurationMs();
  const active = Boolean(plantedAt);
  const elapsed = active ? Date.now() - plantedAt : 0;
  const remainingMs = active ? Math.max(0, bombDurationMs - elapsed) : bombDurationMs;
  const dangerMs = lastState.hasDefuseKit ? defuseDurationMs.kit : defuseDurationMs.noKit;

  bombState = {
    active,
    remainingMs,
    progress: Math.max(0, Math.min(1, remainingMs / bombDurationMs)),
    isCt: lastState.playerTeam === 'CT',
    hasDefuseKit: lastState.hasDefuseKit,
    dangerMs,
    danger: active && lastState.playerTeam === 'CT' && remainingMs <= dangerMs,
    plantedAt,
    phase: lastState.phase,
  };

  broadcast('bomb:update', bombState);
}

function startTicker() {
  setInterval(() => {
    if (!lastState.bombPlantedAt) return;
    updateBombState();
    if (bombState.remainingMs <= 0) {
      lastState.bombPlantedAt = null;
      setTimeout(() => {
        bombState = createInitialBombState();
        bombState.phase = 'exploded';
        broadcast('bomb:update', bombState);
      }, 1000);
    }
  }, 100);

  setInterval(() => {
    if (!lastState.lastPayloadAt) return;
    const connected = Date.now() - lastState.lastPayloadAt < 5000;
    if (lastState.connected !== connected) {
      lastState.connected = connected;
      broadcast('game:update', lastState);
    }
  }, 1000);
}

function checkGameProcess() {
  if (!isWindows) {
    runtimeStatus = {
      gameRunning: Boolean(lastState.connected),
      gameProcess: 'cs2.exe',
      checkedAt: Date.now(),
      error: '当前系统不支持进程检测，已用 GSI 信号辅助判断。',
    };
    broadcast('runtime:update', runtimeStatus);
    return;
  }

  execFile('tasklist', ['/FI', 'IMAGENAME eq cs2.exe', '/FO', 'CSV', '/NH'], { windowsHide: true }, (error, stdout) => {
    if (error) {
      runtimeStatus = {
        ...runtimeStatus,
        checkedAt: Date.now(),
        error: error.message,
      };
      broadcast('runtime:update', runtimeStatus);
      return;
    }
    const gameRunning = stdout.toLowerCase().includes('cs2.exe');
    if (runtimeStatus.gameRunning !== gameRunning || runtimeStatus.error) {
      runtimeStatus = {
        gameRunning,
        gameProcess: 'cs2.exe',
        checkedAt: Date.now(),
        error: null,
      };
      broadcast('runtime:update', runtimeStatus);
      return;
    }
    runtimeStatus.checkedAt = Date.now();
  });
}

function startRuntimeMonitor() {
  checkGameProcess();
  setInterval(checkGameProcess, 3000);
}

function broadcast(channel, payload) {
  const nextPayload = channel === 'settings:update' ? getClientSettings() : payload;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, nextPayload);
  }
  if (orbWindow && !orbWindow.isDestroyed()) {
    orbWindow.webContents.send(channel, nextPayload);
  }
  if (monitorOverlayWindow && !monitorOverlayWindow.isDestroyed()) {
    monitorOverlayWindow.webContents.send(channel, nextPayload);
  }
}

function getClientSettings() {
  return {
    ...settings,
    background: getBackgroundClientSettings(),
  };
}

function getPublicRemoteData() {
  settings.remoteData = normalizeRemoteDataSettings(settings.remoteData || {});
  return {
    baseUrl: settings.remoteData.baseUrl,
    sponsors: settings.remoteData.sponsors,
    notices: settings.remoteData.notices,
    seenNoticeIds: settings.remoteData.seenNoticeIds,
    fetchedAt: settings.remoteData.fetchedAt,
    error: settings.remoteData.error,
  };
}

function addCacheBuster(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('_refresh', String(Date.now()));
  return parsed.toString();
}

function buildRemoteDataUrls(baseUrl, fileName, options = {}) {
  const force = Boolean(options.force);
  const rawUrl = `${baseUrl}/${fileName}`;
  const githubRawMatch = rawUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)$/);
  const urls = [];
  if (githubRawMatch) {
    const [, repo, branch, filePath] = githubRawMatch;
    if (force) {
      const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
      urls.push(`https://api.github.com/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`);
      urls.push(rawUrl);
      urls.push(...remoteDataProxyPrefixes.map(prefix => `${prefix}${rawUrl}`));
      urls.push(`https://ghproxy.net/${rawUrl}`);
      urls.push(`https://cdn.jsdelivr.net/gh/${repo}@${branch}/${filePath}`);
    } else {
      urls.push(`https://cdn.jsdelivr.net/gh/${repo}@${branch}/${filePath}`);
      urls.push(`https://ghproxy.net/${rawUrl}`);
      urls.push(...remoteDataProxyPrefixes.map(prefix => `${prefix}${rawUrl}`));
      urls.push(rawUrl);
    }
  } else {
    urls.push(rawUrl);
  }
  const uniqueUrls = [...new Set(urls)];
  return force ? uniqueUrls.map(addCacheBuster) : uniqueUrls;
}

async function fetchRemoteDataJson(baseUrl, fileName, options = {}) {
  const urls = buildRemoteDataUrls(baseUrl, fileName, options);
  const errors = [];
  for (const url of urls) {
    try {
      let data = await fetchJson(url, { preferSystemNetwork: Boolean(options.force) });
      if (url.startsWith('https://api.github.com/repos/') && data?.encoding === 'base64' && data.content) {
        const raw = Buffer.from(String(data.content).replace(/\s/g, ''), 'base64').toString('utf8').replace(/^\uFEFF/, '');
        data = JSON.parse(raw);
      }
      return { data, url };
    } catch (error) {
      errors.push(`${url}：${error.message || '读取失败'}`);
    }
  }
  throw new Error(errors.join('；'));
}

async function refreshRemoteData(options = {}) {
  const force = Boolean(options.force);
  settings.remoteData = normalizeRemoteDataSettings(settings.remoteData || {});
  const baseUrl = normalizeRemoteDataBaseUrl(settings.remoteData.baseUrl);
  const errors = [];
  let sponsors = settings.remoteData.sponsors;
  let notices = settings.remoteData.notices;

  try {
    const sponsorsResult = await fetchRemoteDataJson(baseUrl, 'sponsors.json', { force });
    const sponsorsRaw = sponsorsResult.data;
    sponsors = sponsorsRaw?.sponsors || [];
  } catch (error) {
    errors.push(`赞助名单：${error.message || '读取失败'}`);
  }

  try {
    const noticesResult = await fetchRemoteDataJson(baseUrl, 'notices.json', { force });
    const noticesRaw = noticesResult.data;
    notices = noticesRaw?.notices || [];
  } catch (error) {
    errors.push(`更新提示：${error.message || '读取失败'}`);
  }

  settings.remoteData = normalizeRemoteDataSettings({
    ...settings.remoteData,
    baseUrl,
    sponsors,
    notices,
    fetchedAt: errors.length === 2 ? settings.remoteData.fetchedAt || null : Date.now(),
    error: errors.join('；'),
  });
  const seenNoticeIds = new Set(settings.remoteData.seenNoticeIds);
  settings.remoteData.notices.forEach(notice => {
    const hasVersionedSeenKey = [...seenNoticeIds].some(item => item.startsWith(`${notice.id}@`));
    if (seenNoticeIds.has(notice.id) && !hasVersionedSeenKey) seenNoticeIds.add(notice.seenKey);
  });
  settings.remoteData.seenNoticeIds = [...seenNoticeIds].slice(-120);
  saveSettings();
  return getPublicRemoteData();
}

function markRemoteNoticeSeen(noticeId) {
  const id = String(noticeId || '').trim();
  if (!id) return getPublicRemoteData();
  settings.remoteData = normalizeRemoteDataSettings(settings.remoteData || {});
  settings.remoteData.seenNoticeIds = [...new Set([...settings.remoteData.seenNoticeIds, id])].slice(-120);
  saveSettings();
  return getPublicRemoteData();
}

function getClientState() {
  return {
    settings: getClientSettings(),
    game: lastState,
    bomb: bombState,
    server: {
      ...serverStatus,
      running: Boolean(gsiServer?.listening),
    },
    cfgStatus: getCfgStatus(),
    runtime: runtimeStatus,
    custom: getCustomState(),
    toolbox: {
      demos: scanDemoFiles(),
      proProfiles: proProfiles.map(({ commands, ...profile }) => profile),
      fontOptions: cs2FontOptions,
      introOptions: cs2IntroOptions,
      latencyTargets,
    },
    onlineData: getPublicRemoteData(),
  };
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean).map(item => path.normalize(item)))];
}

function getWindowsDriveRoots() {
  if (!isWindows) return [];
  const roots = [];
  for (let code = 67; code <= 90; code += 1) {
    const root = `${String.fromCharCode(code)}:\\`;
    if (fs.existsSync(root)) roots.push(root);
  }
  return roots;
}

function readSteamPathFromRegistry() {
  if (!isWindows) return [];
  const registryQueries = [
    ['HKCU\\Software\\Valve\\Steam', 'SteamPath'],
    ['HKCU\\Software\\Valve\\Steam', 'InstallPath'],
    ['HKLM\\Software\\WOW6432Node\\Valve\\Steam', 'InstallPath'],
    ['HKLM\\Software\\Valve\\Steam', 'InstallPath'],
  ];
  const results = [];
  for (const [key, valueName] of registryQueries) {
    try {
      const output = execFileSync('reg', ['query', key, '/v', valueName], { encoding: 'utf8', windowsHide: true, timeout: 1200 });
      const match = output.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)`, 'i'));
      if (match?.[1]) results.push(match[1].trim().replace(/\//g, '\\'));
    } catch {}
  }
  return results;
}

function getSteamRootCandidates() {
  if (!isWindows) return [];
  const drives = getWindowsDriveRoots();
  const envCandidates = [
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Steam'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Steam'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Steam'),
  ];
  const driveCandidates = drives.flatMap(root => [
    path.join(root, 'Steam'),
    path.join(root, 'SteamLibrary'),
    path.join(root, 'Program Files', 'Steam'),
    path.join(root, 'Program Files (x86)', 'Steam'),
    path.join(root, 'Games', 'Steam'),
    path.join(root, 'Games', 'SteamLibrary'),
    path.join(root, 'Game', 'Steam'),
    path.join(root, 'Game', 'SteamLibrary'),
  ]);
  return uniquePaths([
    ...readSteamPathFromRegistry(),
    ...envCandidates,
    ...driveCandidates,
    'C:/Program Files (x86)/Steam',
    'C:/Program Files/Steam',
    path.join(os.homedir(), 'AppData/Local/Steam'),
  ]);
}

function readSteamLibraryFolders(steamRoot) {
  const libraryFile = path.join(steamRoot, 'config', 'libraryfolders.vdf');
  if (!fs.existsSync(steamRoot)) return [];
  if (!fs.existsSync(libraryFile)) return [steamRoot];

  try {
    const content = fs.readFileSync(libraryFile, 'utf8');
    const folders = [steamRoot];
    const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
    for (const match of pathMatches) {
      folders.push(match[1].replace(/\\\\/g, '\\'));
    }
    return uniquePaths(folders);
  } catch (error) {
    console.error('Failed to read Steam libraries:', error);
    return [steamRoot];
  }
}

function getSteamConfigCandidates() {
  const candidates = [];
  if (settings.cs2Path) candidates.push(settings.cs2Path);
  if (isWindows) {
    const rootCandidates = getSteamRootCandidates();
    const libraryRoots = uniquePaths([
      ...rootCandidates,
      ...rootCandidates.flatMap(readSteamLibraryFolders),
    ]);
    for (const root of libraryRoots) {
      candidates.push(path.join(root, 'steamapps', 'common', 'Counter-Strike Global Offensive', 'game', 'csgo', 'cfg'));
      candidates.push(path.join(root, 'common', 'Counter-Strike Global Offensive', 'game', 'csgo', 'cfg'));
      candidates.push(path.join(root, 'Counter-Strike Global Offensive', 'game', 'csgo', 'cfg'));
    }
  }
  return uniquePaths(candidates);
}

function resolveCfgDir(inputPath) {
  if (!inputPath) return null;
  const normalized = inputPath.replace(/\\/g, '/');
  if (normalized.endsWith('/game/csgo/cfg') || normalized.endsWith('/csgo/cfg')) return inputPath;

  const candidates = [
    path.join(inputPath, 'game', 'csgo', 'cfg'),
    path.join(inputPath, 'csgo', 'cfg'),
    path.join(inputPath, 'Counter-Strike Global Offensive', 'game', 'csgo', 'cfg'),
    path.join(inputPath, 'steamapps', 'common', 'Counter-Strike Global Offensive', 'game', 'csgo', 'cfg'),
  ];
  const existing = candidates.find(candidate => fs.existsSync(candidate));
  if (existing) return existing;

  if (normalized.endsWith('/Counter-Strike Global Offensive')) {
    return path.join(inputPath, 'game', 'csgo', 'cfg');
  }
  return inputPath;
}

function buildGsiConfig() {
  return `"CS2 GSI Assistant"\n{\n  "uri" "http://127.0.0.1:${gsiPort}"\n  "timeout" "5.0"\n  "buffer"  "0.0"\n  "throttle" "0.0"\n  "heartbeat" "2.0"\n  "data"\n  {\n    "provider"                "1"\n    "map"                     "1"\n    "round"                   "1"\n    "player_id"               "1"\n    "player_state"            "1"\n    "player_weapons"          "1"\n    "player_match_stats"      "1"\n    "player_position"         "1"\n    "bomb"                    "1"\n    "phase_countdowns"        "1"\n    "allplayers_id"           "1"\n    "allplayers_state"        "1"\n    "allplayers_weapons"      "1"\n    "allplayers_match_stats"  "1"\n    "allplayers_position"     "1"\n    "allgrenades"             "1"\n  }\n}\n`;
}

function getCfgStatus() {
  const cfgPaths = normalizeCfgPaths([
    ...(settings?.cfgPaths || []),
    settings?.cfgPath || '',
  ]);
  if (!cfgPaths.length) {
    return {
      installed: false,
      valid: false,
      path: '',
      paths: [],
      validCount: 0,
      totalCount: 0,
      message: '尚未完成游戏配置',
    };
  }

  const results = cfgPaths.map(cfgPath => {
    if (!fs.existsSync(cfgPath)) {
      return {
        path: cfgPath,
        exists: false,
        valid: false,
        message: '配置文件不存在',
      };
    }

    try {
      const content = fs.readFileSync(cfgPath, 'utf8');
      const valid = content.includes(`http://127.0.0.1:${gsiPort}`) && content.includes('"bomb"');
      return {
        path: cfgPath,
        exists: true,
        valid,
        message: valid ? '正常' : '内容需要检查',
      };
    } catch (error) {
      return {
        path: cfgPath,
        exists: false,
        valid: false,
        message: `无法读取：${error.message}`,
      };
    }
  });

  const existing = results.filter(item => item.exists);
  const validItems = results.filter(item => item.valid);
  const primary = validItems[0] || existing[0] || results[0];
  if (!existing.length) {
    return {
      installed: false,
      valid: false,
      path: primary.path,
      paths: cfgPaths,
      validCount: 0,
      totalCount: results.length,
      message: '之前记录的游戏配置文件不存在',
    };
  }

  const allValid = validItems.length === results.length;
  return {
    installed: Boolean(existing.length),
    valid: allValid,
    path: primary.path,
    paths: cfgPaths,
    validCount: validItems.length,
    totalCount: results.length,
    message: allValid
      ? (results.length > 1 ? `游戏配置已写入 ${results.length} 个位置，正在等待 CS2 状态` : '游戏配置已完成，正在等待 CS2 状态')
      : `已写入 ${validItems.length}/${results.length} 个位置，建议重新一键连接`,
  };
}

function writeCfgToDir(targetDir) {
  const resolved = resolveCfgDir(targetDir);
  if (!resolved) throw new Error('未选择 CS2 cfg 目录。');
  fs.mkdirSync(resolved, { recursive: true });
  const cfgPath = path.join(resolved, 'gamestate_integration_cs2_assistant.cfg');
  fs.writeFileSync(cfgPath, buildGsiConfig(), 'utf8');
  return { cfgPath, resolved };
}

async function installCfg(targetDir) {
  const { cfgPath, resolved } = writeCfgToDir(targetDir);
  settings.cs2Path = resolved;
  settings.cfgInstalled = true;
  settings.cfgPath = cfgPath;
  settings.cfgPaths = normalizeCfgPaths([...(settings.cfgPaths || []), cfgPath]);
  saveSettings();
  return cfgPath;
}

async function installCfgToAll(targetDirs) {
  const resolvedDirs = uniquePaths(targetDirs.map(resolveCfgDir).filter(Boolean))
    .filter(candidate => fs.existsSync(candidate));
  if (!resolvedDirs.length) return [];

  const written = resolvedDirs.map(writeCfgToDir);
  const cfgPaths = written.map(item => item.cfgPath);
  settings.cs2Path = written[0].resolved;
  settings.cfgInstalled = true;
  settings.cfgPath = cfgPaths[0] || '';
  settings.cfgPaths = normalizeCfgPaths(cfgPaths);
  saveSettings();
  return cfgPaths;
}

function resetGameState(phase = 'waiting') {
  lastState = createInitialGameState();
  lastState.phase = phase;
  bombState = createInitialBombState();
  bombState.phase = phase;
  lastGsiPayload = null;
  resetKillStreak();
  broadcast('game:update', lastState);
  broadcast('bomb:update', bombState);
  broadcast('custom:update', getCustomState());
}

function buildTestPayload() {
  return {
    round: { phase: 'live', bomb: 'planted' },
    player: {
      team: 'CT',
      state: { defusekit: true },
      match_stats: {},
    },
    bomb: { state: 'planted' },
    phase_countdowns: { phase: 'bomb' },
  };
}

function getDemoDirCandidates() {
  const candidates = [];
  if (settings.toolbox?.demoDir) candidates.push(settings.toolbox.demoDir);
  if (settings.cs2Path) {
    const root = settings.cs2Path.replace(/[\\/]game[\\/]csgo[\\/]cfg$/i, '');
    candidates.push(path.join(root, 'game', 'csgo'));
  }
  return uniquePaths(candidates);
}

function scanDemoFiles() {
  const demoDir = getDemoDirCandidates().find(candidate => fs.existsSync(candidate));
  if (!demoDir) return { dir: settings.toolbox?.demoDir || '', demos: [], message: '还没有选择 Demo 文件夹。' };
  try {
    const demos = fs.readdirSync(demoDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.dem'))
      .map(entry => {
        const filePath = path.join(demoDir, entry.name);
        const stat = fs.statSync(filePath);
        return {
          name: entry.name,
          path: filePath,
          size: stat.size,
          modifiedAt: stat.mtimeMs,
        };
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt);
    return { dir: demoDir, demos, message: demos.length ? `找到 ${demos.length} 个 Demo。` : '这个文件夹里没有 Demo。' };
  } catch (error) {
    return { dir: demoDir, demos: [], message: `Demo 文件夹读不到：${error.message}` };
  }
}

function assertInsideDir(filePath, dir) {
  const relative = path.relative(path.resolve(dir), path.resolve(filePath));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function deleteDemoFile(filePath) {
  const demoDir = settings.toolbox?.demoDir || scanDemoFiles().dir;
  if (!demoDir || !assertInsideDir(filePath, demoDir) || path.extname(filePath).toLowerCase() !== '.dem') {
    throw new Error('只能删除已选择 Demo 文件夹里的 .dem 文件。');
  }
  fs.unlinkSync(filePath);
  return scanDemoFiles();
}

async function openDemoFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Demo 文件不存在。');
  const command = `playdemo "${filePath.replace(/\\/g, '/')}"`;
  clipboard.writeText(command);
  await shell.openExternal('steam://rungameid/730').catch(() => shell.showItemInFolder(filePath));
  return { command };
}

function getToolCfgPath() {
  const cfgDir = settings.cfgPath ? path.dirname(settings.cfgPath) : resolveCfgDir(settings.cs2Path || '');
  if (!cfgDir) return '';
  return path.join(cfgDir, 'cs2_tool_profile.cfg');
}

function applyProProfile(profileId) {
  const profile = proProfiles.find(item => item.id === profileId);
  if (!profile) throw new Error('没有找到这个职业选手设置。');
  const cfgPath = getToolCfgPath();
  if (!cfgPath) throw new Error('请先在“连接”页完成 CS2 配置。');
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, [
    '// CS2工具盒子生成。需要使用时在控制台输入：exec cs2_tool_profile',
    ...profile.commands,
    '',
  ].join('\n'), 'utf8');
  settings.toolbox.proProfileId = profile.id;
  saveSettings();
  return { profile, cfgPath };
}

function restoreProProfile() {
  const cfgPath = getToolCfgPath();
  if (cfgPath && fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
  settings.toolbox.proProfileId = '';
  saveSettings();
  return { cfgPath };
}

function updateToolboxSettings(patch) {
  settings.toolbox = {
    ...getDefaultSettings().toolbox,
    ...(settings.toolbox || {}),
    ...(patch || {}),
  };
  saveSettings();
  broadcast('settings:update', settings);
  return settings.toolbox;
}

function pingHost(target) {
  return new Promise(resolve => {
    if (!isWindows) {
      resolve({ ...target, ok: false, ms: null, message: '当前系统暂不支持内置 ping。' });
      return;
    }
    execFile('ping', ['-n', '1', '-w', '1400', target.host], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve({ ...target, ok: false, ms: null, message: '连接超时或网络不可达。' });
        return;
      }
      const match = stdout.match(/(?:平均|Average)\s*=\s*(\d+)ms/i) || stdout.match(/(?:时间|time)[=<]\s*(\d+)ms/i);
      resolve({ ...target, ok: Boolean(match), ms: match ? Number(match[1]) : null, message: match ? '可达' : '未读到延迟。' });
    });
  });
}

let previousCpuSample = null;
function readCpuUsage() {
  const cpus = os.cpus();
  const sample = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
    return {
      idle: acc.idle + cpu.times.idle,
      total: acc.total + total,
    };
  }, { idle: 0, total: 0 });
  if (!previousCpuSample) {
    previousCpuSample = sample;
    return null;
  }
  const idle = sample.idle - previousCpuSample.idle;
  const total = sample.total - previousCpuSample.total;
  previousCpuSample = sample;
  return total > 0 ? Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100))) : null;
}

function readNvidiaGpu() {
  return new Promise(resolve => {
    execFile('nvidia-smi', [
      '--query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,power.draw',
      '--format=csv,noheader,nounits',
    ], { windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }
      const [utilization, temperature, memoryUsed, memoryTotal, powerDraw] = stdout.trim().split(',').map(item => Number(item.trim()));
      resolve({
        gpuUsage: Number.isFinite(utilization) ? utilization : null,
        gpuTemp: Number.isFinite(temperature) ? temperature : null,
        vramUsed: Number.isFinite(memoryUsed) ? memoryUsed : null,
        vramTotal: Number.isFinite(memoryTotal) ? memoryTotal : null,
        gpuVoltage: null,
        gpuPower: Number.isFinite(powerDraw) ? powerDraw : null,
        source: 'NVIDIA SMI',
      });
    });
  });
}

async function getMonitorSnapshot() {
  const cpuUsage = readCpuUsage();
  const gpu = await readNvidiaGpu();
  return {
    at: Date.now(),
    fps: null,
    cpuUsage,
    cpuTemp: null,
    gpuUsage: gpu?.gpuUsage ?? null,
    gpuTemp: gpu?.gpuTemp ?? null,
    vramUsed: gpu?.vramUsed ?? null,
    vramTotal: gpu?.vramTotal ?? null,
    gpuVoltage: gpu?.gpuVoltage ?? null,
    gpuPower: gpu?.gpuPower ?? null,
    source: gpu?.source || '系统未开放显卡传感器',
  };
}

function fetchJsonWithNode(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      reject(error);
      return;
    }
    const client = parsed.protocol === 'http:' ? http : https;
    const request = client.get(parsed, {
      timeout: 5200,
      headers: {
        'User-Agent': 'CS2 Toolbox/1.0.5',
        Accept: 'application/json,text/plain,*/*',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
      },
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirects < 3) {
        response.resume();
        const nextUrl = new URL(response.headers.location, parsed).toString();
        fetchJson(nextUrl, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { raw += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error('请求超时'));
    });
    request.on('error', reject);
  });
}

function fetchJsonWithPowerShell(url) {
  if (!isWindows) return Promise.reject(new Error('当前系统不支持 PowerShell 后备下载。'));
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      '$ProgressPreference="SilentlyContinue"; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8; (Invoke-WebRequest -Uri $args[0] -UseBasicParsing -TimeoutSec 18 -Headers @{"Cache-Control"="no-cache, no-store, max-age=0"; "Pragma"="no-cache"}).Content',
      url,
    ], {
      windowsHide: true,
      timeout: 22000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || error.message));
        return;
      }
      try {
        resolve(JSON.parse(String(stdout || '').replace(/^\uFEFF/, '')));
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

async function fetchJson(url, options = {}) {
  const preferSystemNetwork = Boolean(options.preferSystemNetwork) && isWindows;
  const primaryFetch = preferSystemNetwork ? fetchJsonWithPowerShell : fetchJsonWithNode;
  const fallbackFetch = preferSystemNetwork ? fetchJsonWithNode : fetchJsonWithPowerShell;
  try {
    return await primaryFetch(url);
  } catch (primaryError) {
    try {
      return await fallbackFetch(url);
    } catch (fallbackError) {
      throw new Error(`${primaryError.message}; 后备下载失败：${fallbackError.message}`);
    }
  }
}

async function fetchSteamStats({ apiKey, steamId }) {
  const key = String(apiKey || settings.steam?.apiKey || '').trim();
  const id = String(steamId || settings.steam?.steamId || '').trim();
  if (!key || !id) throw new Error('请先填写 Steam API Key 和 SteamID64。');
  settings.steam = { apiKey: key, steamId: id };
  saveSettings();
  const url = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${encodeURIComponent(key)}&steamid=${encodeURIComponent(id)}`;
  const data = await fetchJson(url);
  const stats = data?.playerstats?.stats || [];
  const values = Object.fromEntries(stats.map(item => [item.name, Number(item.value)]));
  const kills = values.total_kills || 0;
  const deaths = values.total_deaths || 0;
  const rounds = values.total_rounds_played || 0;
  const matches = values.total_matches_played || 0;
  return {
    steamId: id,
    summary: {
      kd: deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills,
      kills,
      deaths,
      rounds,
      matches,
      wins: values.total_wins || 0,
      mvps: values.total_mvps || 0,
      damage: values.total_damage_done || 0,
      rank: 'Steam 接口未提供当前段位',
    },
    raw: Object.entries(steamStatNames).map(([name, label]) => ({
      label,
      value: values[name] ?? 0,
    })),
    matches: [],
    message: 'Steam 官方统计接口不提供详细比赛记录，需要后续接入可用的比赛记录来源。',
  };
}

function resetOrbPosition() {
  if (!orbWindow || orbWindow.isDestroyed()) return false;
  settings.orb = normalizeOrbSettings(settings.orb || {});
  const displayBounds = screen.getPrimaryDisplay().workArea;
  const x = displayBounds.x + displayBounds.width - settings.orb.size - orbWindowPadding * 2 - 24;
  const y = displayBounds.y + Math.round(displayBounds.height * 0.35);
  settings.orb.x = x;
  settings.orb.y = y;
  saveSettings();
  resizeOrbWindow();
  orbWindow.setPosition(x, y);
  if (settings.orb.visible) orbWindow.show();
  broadcast('settings:update', settings);
  return true;
}

function updateMonitorOverlayVisibility() {
  if (!monitorOverlayWindow || monitorOverlayWindow.isDestroyed()) {
    createMonitorOverlayWindow();
    return;
  }
  const overlaySettings = normalizeMonitorOverlaySettings(settings.monitorOverlay || {});
  settings.enabled !== false && overlaySettings.visible
    ? monitorOverlayWindow.show()
    : monitorOverlayWindow.hide();
}

function fitMonitorOverlayToContent(size = {}) {
  if (!monitorOverlayWindow || monitorOverlayWindow.isDestroyed()) return false;
  const fallback = getMonitorOverlayDefaultSize(normalizeMonitorOverlaySettings(settings.monitorOverlay || {}));
  const width = Math.round(clampNumber(Number(size.width), monitorOverlayMinWidth, monitorOverlayMaxWidth, fallback.width));
  const height = Math.round(clampNumber(Number(size.height), monitorOverlayMinHeight, monitorOverlayMaxHeight, fallback.height));
  const [currentWidth, currentHeight] = monitorOverlayWindow.getContentSize();
  if (currentWidth !== width || currentHeight !== height) {
    monitorOverlayWindow.setContentSize(width, height);
  }
  return true;
}

function resetMonitorOverlayPosition() {
  if (!monitorOverlayWindow || monitorOverlayWindow.isDestroyed()) return false;
  const displayBounds = screen.getPrimaryDisplay().workArea;
  const { width: overlayWidth } = monitorOverlayWindow.getBounds();
  const x = displayBounds.x + displayBounds.width - overlayWidth - 32;
  const y = displayBounds.y + Math.round(displayBounds.height * 0.18);
  settings.monitorOverlay = normalizeMonitorOverlaySettings({
    ...(settings.monitorOverlay || {}),
    x,
    y,
  });
  saveSettings();
  monitorOverlayWindow.setPosition(x, y);
  updateMonitorOverlayVisibility();
  broadcast('settings:update', settings);
  return true;
}

function buildSelfCheck() {
  const cfgStatus = getCfgStatus();
  const officialSoundFiles = killStreakSoundPacks.flatMap(pack => Object.values(pack.filePathByValue)).filter(Boolean);
  const missingOfficialSounds = officialSoundFiles.filter(filePath => !cacheSoundFileExists(filePath));
  const customRules = settings?.customActions?.rules || [];
  const enabledRules = customRules.filter(rule => rule.enabled);
  const checks = [
    {
      id: 'app',
      label: '软件总开关',
      ok: settings.enabled !== false,
      level: settings.enabled !== false ? 'ok' : 'bad',
      detail: settings.enabled !== false ? '软件正在运行。' : '总开关已关闭，自动功能和小窗都会暂停。',
    },
    {
      id: 'server',
      label: '接收服务',
      ok: Boolean(gsiServer?.listening) && !serverStatus.error,
      level: Boolean(gsiServer?.listening) && !serverStatus.error ? 'ok' : 'bad',
      detail: serverStatus.error ? `端口异常：${serverStatus.error}` : `本机端口 ${gsiPort}。`,
    },
    {
      id: 'cfg',
      label: 'CFG 配置',
      ok: Boolean(cfgStatus.installed && cfgStatus.valid),
      level: cfgStatus.installed && cfgStatus.valid ? 'ok' : cfgStatus.installed ? 'warning' : 'bad',
      detail: cfgStatus.message,
    },
    {
      id: 'game',
      label: 'CS2 进程',
      ok: Boolean(runtimeStatus.gameRunning),
      level: runtimeStatus.gameRunning ? 'ok' : 'warning',
      detail: runtimeStatus.gameRunning ? '已检测到 cs2.exe。' : '还没有检测到 CS2，打开游戏后会自动刷新。',
    },
    {
      id: 'gsi',
      label: 'GSI 信号',
      ok: Boolean(lastState.connected),
      level: lastState.connected ? 'ok' : runtimeStatus.gameRunning ? 'warning' : 'muted',
      detail: lastState.connected ? `最近收到：${new Date(lastState.lastPayloadAt).toLocaleTimeString('zh-CN')}` : '还没有收到游戏状态，通常需要进图或重启 CS2。',
    },
    {
      id: 'audio',
      label: '预设音效',
      ok: missingOfficialSounds.length === 0,
      level: missingOfficialSounds.length === 0 ? 'ok' : 'bad',
      detail: missingOfficialSounds.length === 0 ? '预设音效文件完整。' : `缺少 ${missingOfficialSounds.length} 个预设音效文件。`,
    },
    {
      id: 'rules',
      label: '自动功能',
      ok: settings?.customActions?.enabled !== false && enabledRules.length > 0,
      level: settings?.customActions?.enabled === false ? 'warning' : enabledRules.length ? 'ok' : 'muted',
      detail: settings?.customActions?.enabled === false ? '自动功能总开关已关闭。' : `已开启 ${enabledRules.length}/${customRules.length} 个功能。`,
    },
  ];
  const blockers = checks.filter(item => item.level === 'bad');
  const warnings = checks.filter(item => item.level === 'warning');
  return {
    checkedAt: Date.now(),
    ready: blockers.length === 0 && warnings.length === 0,
    level: blockers.length ? 'bad' : warnings.length ? 'warning' : 'ok',
    title: blockers.length ? '还不能正常使用' : warnings.length ? '基本完成，还差一步' : '可以正常使用',
    summary: blockers.length
      ? blockers[0].detail
      : warnings.length
        ? warnings[0].detail
        : 'CFG、接收服务、音效文件和自动功能状态都正常。',
    checks,
  };
}

function buildDiagnostics() {
  const cfgStatus = getCfgStatus();
  const customRules = settings?.customActions?.rules || [];
  const soundFiles = getPresetSoundPacks('kill-streak-sounds', true).flatMap(pack => Object.entries(pack.filePathByValue).map(([key, filePath]) => ({
    pack: pack.name,
    source: pack.source,
    key,
    filePath,
    exists: cacheSoundFileExists(filePath),
  })));
  const diagnostics = {
    app: {
      name: app.getName(),
      version: app.getVersion(),
      packaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      userData: app.getPath('userData'),
    },
    cfgStatus,
    server: {
      ...serverStatus,
      listening: Boolean(gsiServer?.listening),
    },
    runtime: runtimeStatus,
    game: {
      connected: Boolean(lastState.connected),
      phase: lastState.phase,
      mapName: lastState.mapName,
      mapPhase: lastState.mapPhase,
      lastPayloadAt: lastState.lastPayloadAt,
    },
    settings: {
      enabled: settings.enabled !== false,
      theme: settings.theme,
      orbVisible: settings.orb?.visible !== false,
      orb: normalizeOrbSettings(settings.orb || {}),
      lowPerformanceMode: Boolean(settings.lowPerformanceMode),
      launchAtStartup: Boolean(settings.launchAtStartup),
      setupGuideSeen: Boolean(settings.setupGuideSeen),
    },
    custom: {
      enabled: settings?.customActions?.enabled !== false,
      totalRules: customRules.length,
      enabledRules: customRules.filter(rule => rule.enabled).length,
      presetRules: customRules.filter(rule => rule.source === 'preset').map(rule => ({
        id: rule.id,
        presetId: rule.presetId,
        name: getRuleDisplayName(rule),
        soundPackName: rule.playSound?.soundPackName || '',
      })),
      recentLogs: recentActionLogs,
    },
    sounds: soundFiles,
    selfCheck: buildSelfCheck(),
  };
  return {
    ...diagnostics,
    text: formatDiagnosticsText(diagnostics),
  };
}

function formatDiagnosticsText(data) {
  const lines = [
    `CS2工具盒子诊断信息`,
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    `版本：${data.app.version}`,
    `系统：${data.app.platform} ${data.app.arch}`,
    `打包：${data.app.packaged ? '是' : '否'}`,
    `CFG：${data.cfgStatus.message}`,
    `CFG 路径：${(data.cfgStatus.paths || [data.cfgStatus.path]).filter(Boolean).join(' | ') || '无'}`,
    `接收服务：${data.server.listening ? '运行中' : '未运行'} ${data.server.error || ''}`,
    `CS2 进程：${data.runtime.gameRunning ? '已检测到' : '未检测到'} ${data.runtime.error || ''}`,
    `GSI：${data.game.connected ? '已收到' : '未收到'}`,
    `自动功能：${data.custom.enabled ? '开启' : '关闭'}，${data.custom.enabledRules}/${data.custom.totalRules} 个启用`,
    `预设音效：${data.sounds.filter(item => item.exists).length}/${data.sounds.length} 个存在`,
    '',
    '最近触发：',
    ...(data.custom.recentLogs.length
      ? data.custom.recentLogs.map(log => `${new Date(log.time).toLocaleTimeString('zh-CN')} ${log.name}：${log.action}`)
      : ['无']),
    '',
    '音效文件：',
    ...data.sounds.map(item => `${item.exists ? 'OK' : 'MISS'} ${item.pack} ${item.key}杀 ${item.filePath}`),
  ];
  return lines.join('\n');
}

function testCustomSound(ruleId, streak = 1) {
  const customActions = ensureCustomSettings();
  const rule = customActions.rules.find(item => item.id === ruleId);
  if (!rule) throw new Error('没有找到这个自动功能。');
  if (!rule.playSound?.enabled) throw new Error('这个功能没有开启声音。');

  const key = String(Math.max(1, Math.min(5, Number(streak) || 1)));
  const soundPath = String(rule.playSound.filePathByValue?.[key] || rule.playSound.filePath || '').trim();
  if (!soundPath) throw new Error('这个音效没有配置声音文件。');
  if (!cacheSoundFileExists(soundPath)) throw new Error('声音文件不存在，建议重新安装或重新选择音效。');

  broadcast('custom:play-sound', { ruleId: rule.id, itemId: rule.eventId, filePath: soundPath, isKillSound: isKillSoundRule(rule) });
  addActionLog(rule, `试听 ${key}杀音效`);
  broadcast('custom:update', getCustomState());
  return { ok: true, filePath: soundPath, streak: key };
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return true;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  return true;
}

function ensureCustomSettings() {
  settings.customActions = normalizeCustomActions(settings.customActions || {});
  return settings.customActions;
}

function validateCustomSoundPackInput(input = {}) {
  const name = String(input.name || '').trim().slice(0, 40);
  if (!name) throw new Error('请先给这套音效命名。');
  const filePathByValue = normalizeKillSoundFileMap(input.filePathByValue);
  for (const key of killSoundStreakKeys) {
    const filePath = filePathByValue[key];
    if (!filePath) throw new Error(`请选择 ${key} 杀音效。`);
    if (!fs.existsSync(filePath)) throw new Error(`${key} 杀音效文件不存在。`);
  }
  return { name, filePathByValue };
}

function applyKillSoundPackToRule(rule, pack) {
  const preset = officialPresets.find(item => item.id === 'kill-streak-sounds');
  return normalizeCustomRule({
    ...rule,
    source: 'preset',
    presetId: 'kill-streak-sounds',
    name: preset.rule.name,
    description: preset.rule.description,
    playSound: {
      ...(rule.playSound || {}),
      enabled: true,
      filePath: '',
      filePathByValue: pack.filePathByValue,
      soundPackId: pack.id,
      soundPackName: pack.name,
      useKillStreak: true,
    },
  });
}

function saveCustomKillSoundPack(input = {}) {
  const customActions = ensureCustomSettings();
  const valid = validateCustomSoundPackInput(input);
  const pack = normalizeCustomSoundPack({
    id: input.id,
    name: valid.name,
    filePathByValue: valid.filePathByValue,
  });
  const index = customActions.soundPacks.findIndex(item => item.id === pack.id);
  if (index >= 0) {
    customActions.soundPacks[index] = pack;
  } else {
    customActions.soundPacks.push(pack);
  }

  const ruleIndex = customActions.rules.findIndex(rule => rule.source === 'preset' && rule.presetId === 'kill-streak-sounds');
  if (ruleIndex >= 0) {
    customActions.rules[ruleIndex] = applyKillSoundPackToRule(customActions.rules[ruleIndex], pack);
  }

  saveSettings();
  warmConfiguredSoundFiles();
  broadcast('settings:update', settings);
  broadcast('custom:update', getCustomState());
  return getCustomState();
}

function deleteCustomKillSoundPack(soundPackId) {
  const customActions = ensureCustomSettings();
  const pack = customActions.soundPacks.find(item => item.id === soundPackId);
  if (!pack) throw new Error('没有找到这套自定义音效。');
  customActions.soundPacks = customActions.soundPacks.filter(item => item.id !== soundPackId);

  const fallback = getOfficialPresetSoundPack('kill-streak-sounds', killStreakSoundPacks[0].id);
  customActions.rules = customActions.rules.map(rule => {
    if (rule.source === 'preset' && rule.presetId === 'kill-streak-sounds' && rule.playSound?.soundPackId === soundPackId) {
      return applyKillSoundPackToRule(rule, fallback);
    }
    return rule;
  });

  saveSettings();
  warmConfiguredSoundFiles();
  broadcast('settings:update', settings);
  broadcast('custom:update', getCustomState());
  return getCustomState();
}

function validateEventSoundInput(input = {}) {
  const config = normalizeEventSoundConfig(input);
  if (!config.name) throw new Error('请先给这个音效命名。');
  if (!config.eventId) throw new Error('请选择一个触发事件。');
  if (!config.filePath) throw new Error('请选择要播放的音频文件。');
  if (!fs.existsSync(config.filePath)) throw new Error('音频文件不存在，请重新选择。');
  return config;
}

function saveEventSoundConfig(input = {}) {
  const customActions = ensureCustomSettings();
  const valid = validateEventSoundInput(input);
  const index = customActions.eventSounds.findIndex(item => item.id === valid.id);
  if (index >= 0) {
    customActions.eventSounds[index] = valid;
  } else {
    customActions.eventSounds.push(valid);
  }

  saveSettings();
  warmConfiguredSoundFiles();
  broadcast('settings:update', settings);
  broadcast('custom:update', getCustomState());
  return getCustomState();
}

function deleteEventSoundConfig(configId) {
  const customActions = ensureCustomSettings();
  const before = customActions.eventSounds.length;
  customActions.eventSounds = customActions.eventSounds.filter(item => item.id !== configId);
  if (customActions.eventSounds.length === before) throw new Error('没有找到这个音效配置。');
  customTriggerLastRunAt.delete(configId);

  saveSettings();
  warmConfiguredSoundFiles();
  broadcast('settings:update', settings);
  broadcast('custom:update', getCustomState());
  return getCustomState();
}

function testEventSoundConfig(configId) {
  const customActions = ensureCustomSettings();
  const config = customActions.eventSounds.find(item => item.id === configId);
  if (!config) throw new Error('没有找到这个音效配置。');
  if (!config.filePath || !cacheSoundFileExists(config.filePath)) throw new Error('音频文件不存在，请重新选择。');
  const boardRule = customActions.rules.find(rule => rule.source === 'preset' && rule.presetId === 'event-soundboard') || { id: 'event-soundboard', name: '音效自定义' };
  broadcast('custom:play-sound', { ruleId: boardRule.id, itemId: config.eventId, filePath: config.filePath, isKillSound: false });
  addActionLog(boardRule, `${config.name}：试听声音`);
  broadcast('custom:update', getCustomState());
  return { ok: true, filePath: config.filePath };
}

function applyMasterEnabled(enabled) {
  settings.enabled = Boolean(enabled);
  if (settings.enabled === false) {
    closeAllManagedWebWindows();
    lastState.bombPlantedAt = null;
    bombState = createInitialBombState();
    bombState.phase = 'paused';
    if (orbWindow && !orbWindow.isDestroyed()) orbWindow.hide();
    if (monitorOverlayWindow && !monitorOverlayWindow.isDestroyed()) monitorOverlayWindow.hide();
  } else {
    if (settings.orb.visible && orbWindow && !orbWindow.isDestroyed()) orbWindow.show();
    updateMonitorOverlayVisibility();
  }
  broadcast('bomb:update', bombState);
  broadcast('game:update', lastState);
}

function applyBombDurationSec(value) {
  settings.bombDurationSec = normalizeBombDurationSec(value);
  if (lastState.bombPlantedAt) {
    updateBombState();
  } else {
    bombState = {
      ...bombState,
      remainingMs: getBombDurationMs(),
      progress: 1,
    };
    broadcast('bomb:update', bombState);
  }
}

function applyBackgroundSettings(patch = {}) {
  settings.background = normalizeBackgroundSettings({
    ...(settings.background || {}),
    ...(patch || {}),
  });
  saveSettings();
  broadcast('settings:update', settings);
  return getClientSettings();
}

async function chooseBackgroundImage() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择软件背景图片',
    properties: ['openFile'],
    filters: [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true, settings: getClientSettings() };
  }

  const sourcePath = result.filePaths[0];
  const extension = path.extname(sourcePath).toLowerCase() || '.jpg';
  const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);
  if (!allowedExtensions.has(extension)) throw new Error('请选择 jpg、png、webp 或 bmp 图片。');

  const backgroundDir = path.join(app.getPath('userData'), 'backgrounds');
  fs.mkdirSync(backgroundDir, { recursive: true });
  const targetPath = path.join(backgroundDir, `custom-background${extension}`);
  fs.copyFileSync(sourcePath, targetPath);

  settings.background = normalizeBackgroundSettings({
    ...(settings.background || {}),
    mode: 'custom',
    customImagePath: targetPath,
  });
  saveSettings();
  broadcast('settings:update', settings);
  return { canceled: false, settings: getClientSettings() };
}

function registerIpcHandlers() {
  ipcMain.handle('settings:get', () => getClientState());
  ipcMain.handle('settings:set-enabled', (_event, enabled) => {
    applyMasterEnabled(enabled);
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:set-theme', (_event, theme) => {
    settings.theme = theme === 'light' ? 'light' : 'dark';
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:set-accent-color', (_event, color) => {
    settings.accentColor = normalizeAccentColor(color);
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:update-background', (_event, patch = {}) => applyBackgroundSettings(patch));
  ipcMain.handle('settings:choose-background-image', () => chooseBackgroundImage());
  ipcMain.handle('settings:set-bomb-duration', (_event, seconds) => {
    applyBombDurationSec(seconds);
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:set-orb-visible', (_event, visible) => {
    settings.orb = normalizeOrbSettings({
      ...(settings.orb || {}),
      visible: Boolean(visible),
    });
    saveSettings();
    if (orbWindow) {
      resizeOrbWindow();
      settings.enabled !== false && settings.orb.visible ? orbWindow.show() : orbWindow.hide();
    }
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:update-orb', (_event, patch = {}) => {
    settings.orb = normalizeOrbSettings({
      ...(settings.orb || {}),
      ...(patch || {}),
    });
    saveSettings();
    if (orbWindow) {
      resizeOrbWindow();
      settings.enabled !== false && settings.orb.visible ? orbWindow.show() : orbWindow.hide();
    }
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:set-monitor-overlay-visible', (_event, visible) => {
    settings.monitorOverlay = normalizeMonitorOverlaySettings({
      ...(settings.monitorOverlay || {}),
      visible: Boolean(visible),
    });
    saveSettings();
    updateMonitorOverlayVisibility();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:update-monitor-overlay', (_event, patch = {}) => {
    settings.monitorOverlay = normalizeMonitorOverlaySettings({
      ...(settings.monitorOverlay || {}),
      ...(patch || {}),
    });
    saveSettings();
    updateMonitorOverlayVisibility();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('monitor-overlay:fit-content', (_event, size = {}) => fitMonitorOverlayToContent(size));
  ipcMain.handle('settings:set-low-performance', (_event, enabled) => {
    settings.lowPerformanceMode = Boolean(enabled);
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:set-startup', (_event, enabled) => {
    applyStartupSetting(enabled);
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:set-audio', (_event, patch = {}) => {
    settings.audio = normalizeAudioSettings({
      ...(settings.audio || {}),
      ...(patch || {}),
    });
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('diagnostics:self-check', () => buildSelfCheck());
  ipcMain.handle('diagnostics:get', () => buildDiagnostics());
  ipcMain.handle('diagnostics:copy', () => {
    const diagnostics = buildDiagnostics();
    clipboard.writeText(diagnostics.text);
    return diagnostics;
  });
  ipcMain.handle('online-data:get', (_event, force = false) => refreshRemoteData({ force: Boolean(force) }));
  ipcMain.handle('online-data:mark-notice-seen', (_event, noticeId) => markRemoteNoticeSeen(noticeId));
  ipcMain.handle('onboarding:complete', () => {
    settings.onboarding = {
      ...getDefaultSettings().onboarding,
      ...(settings.onboarding || {}),
      completed: true,
    };
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('onboarding:restart', () => {
    settings.onboarding = {
      ...getDefaultSettings().onboarding,
      ...(settings.onboarding || {}),
      completed: false,
    };
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('setup-guide:complete', () => {
    settings.setupGuideSeen = true;
    saveSettings();
    broadcast('settings:update', settings);
    return getClientSettings();
  });
  ipcMain.handle('settings:reset-orb-position', () => resetOrbPosition());
  ipcMain.handle('settings:reset-monitor-overlay-position', () => resetMonitorOverlayPosition());
  ipcMain.handle('cfg:choose-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 CS2 的 cfg 文件夹，或选择 Counter-Strike Global Offensive 根目录',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const cfgPath = await installCfg(result.filePaths[0]);
    broadcast('settings:update', settings);
    return { cfgPath, settings: getClientSettings() };
  });
  ipcMain.handle('cfg:auto-install', async () => {
    const candidates = getSteamConfigCandidates();
    const cfgPaths = await installCfgToAll(candidates);
    if (!cfgPaths.length) {
      return { ok: false, message: '已检查 Steam 库和常见盘符，但没有找到 CS2 cfg 目录，请手动选择。' };
    }
    broadcast('settings:update', settings);
    return { ok: true, cfgPath: cfgPaths[0], cfgPaths, settings: getClientSettings() };
  });
  ipcMain.handle('cfg:status', () => getCfgStatus());
  ipcMain.handle('cfg:open-folder', async () => {
    const folder = settings.cfgPath ? path.dirname(settings.cfgPath) : settings.cs2Path;
    if (!folder) return false;
    await shell.openPath(folder);
    return true;
  });
  ipcMain.handle('gsi:test-payload', () => {
    processGsiPayload(buildTestPayload());
    return getClientState();
  });
  ipcMain.handle('gsi:reset-state', () => {
    resetGameState();
    return getClientState();
  });
  ipcMain.handle('custom:set-enabled', (_event, enabled) => {
    const customActions = ensureCustomSettings();
    customActions.enabled = Boolean(enabled);
    saveSettings();
    broadcast('settings:update', settings);
    broadcast('custom:update', getCustomState());
    return getCustomState();
  });
  ipcMain.handle('custom:get-presets', () => getCustomPresetsState());
  ipcMain.handle('custom:test-sound', (_event, ruleId, streak) => testCustomSound(ruleId, streak));
  ipcMain.handle('custom:add-preset', (_event, presetId) => {
    const preset = officialPresets.find(item => item.id === presetId);
    if (!preset) throw new Error('没有找到这个官方玩法。');
    const customActions = ensureCustomSettings();
    const existingRules = customActions.rules.filter(rule => rule.source === 'preset' && rule.presetId === presetId);
    if (existingRules.length) {
      const existingIds = new Set(existingRules.map(rule => rule.id));
      customActions.rules = customActions.rules.filter(rule => !existingIds.has(rule.id));
      if (presetId === 'event-soundboard') {
        customActions.eventSounds = [];
      }
      existingIds.forEach(ruleId => {
        const managed = managedWebWindows.get(ruleId)?.window;
        if (managed && !managed.isDestroyed()) managed.close();
        managedWebWindows.delete(ruleId);
        customTriggerLastRunAt.delete(ruleId);
      });
      saveSettings();
      broadcast('settings:update', settings);
      broadcast('custom:update', getCustomState());
      return getCustomState();
    }
    customActions.rules.push(normalizeCustomRule({
      ...cloneRule(preset.rule),
      id: createCustomRuleId('preset'),
    }));
    saveSettings();
    warmConfiguredSoundFiles();
    broadcast('settings:update', settings);
    broadcast('custom:update', getCustomState());
    return getCustomState();
  });
  ipcMain.handle('custom:set-preset-sound', (_event, presetId, soundPackId) => {
    const preset = officialPresets.find(item => item.id === presetId);
    if (!preset) throw new Error('没有找到这个官方玩法。');
    const pack = getOfficialPresetSoundPack(presetId, soundPackId);
    if (!pack) throw new Error('这个官方玩法暂时没有可选音效。');

    const customActions = ensureCustomSettings();
    const index = customActions.rules.findIndex(rule => rule.source === 'preset' && rule.presetId === presetId);
    if (index === -1) throw new Error('请先添加这个官方玩法。');

    const current = customActions.rules[index];
    customActions.rules[index] = normalizeCustomRule({
      ...current,
      name: preset.rule.name,
      description: preset.rule.description,
      playSound: {
        ...(current.playSound || {}),
        enabled: true,
        filePath: '',
        filePathByValue: pack.filePathByValue,
        soundPackId: pack.id,
        soundPackName: pack.name,
        useKillStreak: true,
      },
    });
    saveSettings();
    warmConfiguredSoundFiles();
    broadcast('settings:update', settings);
    broadcast('custom:update', getCustomState());
    return getCustomState();
  });
  ipcMain.handle('custom:save-sound-pack', (_event, presetId, pack) => {
    if (presetId !== 'kill-streak-sounds') throw new Error('这个官方玩法不支持自定义音效包。');
    return saveCustomKillSoundPack(pack);
  });
  ipcMain.handle('custom:delete-sound-pack', (_event, presetId, soundPackId) => {
    if (presetId !== 'kill-streak-sounds') throw new Error('这个官方玩法不支持删除音效包。');
    return deleteCustomKillSoundPack(soundPackId);
  });
  ipcMain.handle('custom:save-event-sound', (_event, config) => saveEventSoundConfig(config));
  ipcMain.handle('custom:delete-event-sound', (_event, configId) => deleteEventSoundConfig(configId));
  ipcMain.handle('custom:test-event-sound', (_event, configId) => testEventSoundConfig(configId));
  ipcMain.handle('custom:add-rule', (_event, rule) => {
    const customActions = ensureCustomSettings();
    customActions.rules.push(normalizeCustomRule({
      ...rule,
      id: createCustomRuleId('rule'),
      source: 'manual',
      presetId: '',
    }));
    saveSettings();
    warmConfiguredSoundFiles();
    broadcast('settings:update', settings);
    broadcast('custom:update', getCustomState());
    return getCustomState();
  });
  ipcMain.handle('custom:update-rule', (_event, ruleId, patch) => {
    const customActions = ensureCustomSettings();
    const index = customActions.rules.findIndex(rule => rule.id === ruleId);
    if (index === -1) throw new Error('没有找到这个自动功能。');
    const current = customActions.rules[index];
    if (current.source === 'preset') throw new Error('官方玩法不能编辑。');
    customActions.rules[index] = normalizeCustomRule({
      ...current,
      ...patch,
      openUrl: {
        ...(current.openUrl || {}),
        ...(patch.openUrl || {}),
      },
      returnGame: {
        ...(current.returnGame || {}),
        ...(patch.returnGame || {}),
      },
      id: current.id,
      source: current.source,
      presetId: current.presetId,
    });
    saveSettings();
    warmConfiguredSoundFiles();
    broadcast('settings:update', settings);
    broadcast('custom:update', getCustomState());
    return getCustomState();
  });
  ipcMain.handle('custom:delete-rule', (_event, ruleId) => {
    const customActions = ensureCustomSettings();
    customActions.rules = customActions.rules.filter(rule => rule.id !== ruleId);
    const managed = managedWebWindows.get(ruleId)?.window;
    if (managed && !managed.isDestroyed()) managed.close();
    managedWebWindows.delete(ruleId);
    customTriggerLastRunAt.delete(ruleId);
    saveSettings();
    broadcast('settings:update', settings);
    broadcast('custom:update', getCustomState());
    return getCustomState();
  });
  ipcMain.handle('custom:test-rule', (_event, ruleId) => {
    const rule = ensureCustomSettings().rules.find(item => item.id === ruleId);
    if (!rule) throw new Error('没有找到这个自动功能。');
    if (rule.presetId === 'event-soundboard') {
      const firstConfig = ensureCustomSettings().eventSounds[0];
      if (!firstConfig) throw new Error('请先配置至少一个事件音效。');
      return testEventSoundConfig(firstConfig.id);
    }
    executeCustomActions(normalizeCustomRule(rule));
    return true;
  });
  ipcMain.handle('custom:choose-file', async (_event, kind) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: kind === 'sound' ? '选择要播放的声音文件' : '选择要打开的文件',
      properties: ['openFile'],
      filters: kind === 'sound'
        ? [{ name: '声音文件', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] }, { name: '所有文件', extensions: ['*'] }]
        : [{ name: '所有文件', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('toolbox:choose-demo-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 Demo 文件夹',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return scanDemoFiles();
    settings.toolbox.demoDir = result.filePaths[0];
    saveSettings();
    broadcast('settings:update', settings);
    return scanDemoFiles();
  });
  ipcMain.handle('toolbox:scan-demos', () => scanDemoFiles());
  ipcMain.handle('toolbox:delete-demo', (_event, filePath) => deleteDemoFile(filePath));
  ipcMain.handle('toolbox:open-demo', (_event, filePath) => openDemoFile(filePath));
  ipcMain.handle('toolbox:apply-pro-profile', (_event, profileId) => {
    const result = applyProProfile(profileId);
    broadcast('settings:update', settings);
    return result;
  });
  ipcMain.handle('toolbox:restore-pro-profile', () => {
    const result = restoreProProfile();
    broadcast('settings:update', settings);
    return result;
  });
  ipcMain.handle('toolbox:update-settings', (_event, patch) => updateToolboxSettings(patch));
  ipcMain.handle('toolbox:test-latency', async () => Promise.all(latencyTargets.map(pingHost)));
  ipcMain.handle('monitor:get-snapshot', () => getMonitorSnapshot());
  ipcMain.handle('stats:fetch-steam', (_event, payload) => fetchSteamStats(payload || {}));
  ipcMain.handle('floating-window:move-by', (event, delta) => moveFloatingWindowBy(event.sender, delta));
  ipcMain.handle('floating-menu:action', (_event, source, action) => handleFloatingMenuAction(source, action));
  ipcMain.handle('floating-menu:close', () => {
    if (floatingMenuWindow && !floatingMenuWindow.isDestroyed()) floatingMenuWindow.hide();
    return true;
  });
  ipcMain.handle('app:quit', () => {
    app.quit();
  });
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:close', () => mainWindow?.minimize());
  ipcMain.handle('window:toggle-main', () => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
      return showMainWindow();
    }
    mainWindow.minimize();
    return false;
  });
  ipcMain.handle('window:toggle-orb', () => {
    if (!orbWindow) return false;
    if (settings.enabled === false) return false;
    if (orbWindow.isVisible()) {
      orbWindow.hide();
      settings.orb.visible = false;
    } else {
      orbWindow.show();
      settings.orb.visible = true;
    }
    saveSettings();
    broadcast('settings:update', settings);
    return settings.orb.visible;
  });
}

function createApplicationWindows() {
  createMainWindow();
  createOrbWindow();
  createMonitorOverlayWindow();
}

function initializeApplication() {
  settings = loadSettings();
  warmConfiguredSoundFiles();
  applyStartupSetting(settings.launchAtStartup);
  registerIpcHandlers();
  createApplicationWindows();
  startGsiServer();
  startTicker();
  startRuntimeMonitor();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createApplicationWindows();
    else showMainWindow();
  });
}

if (singleInstanceLock) {
  app.whenReady().then(initializeApplication);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (gsiServer) gsiServer.close();
});
