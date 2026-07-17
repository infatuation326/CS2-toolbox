const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('src/main/main.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.match(main, /function getProviderSteamId\(/, '应读取 provider.steamid 作为本机玩家标识');
assert.match(main, /function getPlayerSteamId\(/, '应读取 player.steamid 作为当前 player 标识');
assert.match(main, /function isLocalPlayerPayload\(/, '应提供本机玩家校验');
assert.match(main, /function getLocalRoundKillCount\(/, '应通过本机玩家读取本回合击杀数');
assert.match(main, /if \(isLocalPlayerPayload\(payload\)\) return getRoundKillCountFromEntry\(payload\.player\);/, '只有当前 player 是本机玩家时才读取 player 击杀数');
assert.match(main, /return null;/, '非本机玩家或观战数据应返回 null');
assert.match(main, /if \(after === null\) return '';/, '连杀音效必须忽略队友或观战玩家的击杀');
assert.match(main, /function getBundledRendererAssetPath\(/, '预设音效应通过打包资源路径解析');
assert.match(main, /app\.asar\.unpacked/, '打包后的预设音效应指向解包后的真实文件');
assert.ok(packageJson.build.asarUnpack.includes('src/renderer/assets/sounds/**/*'), '发布包必须解包预设音效文件');
assert.match(main, /const recentActionLogs = \[\]/, '应记录最近自动功能触发日志');
assert.match(main, /ipcMain\.handle\('custom:test-sound'/, '应提供击杀音效试听接口');
assert.match(main, /ipcMain\.handle\('diagnostics:self-check'/, '应提供一键自检接口');
assert.match(main, /ipcMain\.handle\('diagnostics:copy'/, '应提供复制诊断信息接口');
assert.match(main, /setupGuideSeen: false/, '应记录首次配置完成引导是否已看过');
