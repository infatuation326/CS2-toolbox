const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('src/main/main.js', 'utf8');

assert.match(main, /function getWindowsDriveRoots\(/, '应扫描 Windows 已存在盘符');
assert.match(main, /function readSteamPathFromRegistry\(/, '应读取注册表里的 Steam 路径');
assert.match(main, /SteamLibrary/, '应检查非默认 SteamLibrary 目录');
assert.match(main, /Games['"], ['"]SteamLibrary/, '应检查常见 Games/SteamLibrary 目录');
assert.match(main, /common['"], ['"]Counter-Strike Global Offensive/, '应兼容 Steam 库根目录和 steamapps 目录');
assert.match(main, /cfgPaths: \[\]/, '设置中应支持记录多个 cfg 写入位置');
assert.match(main, /async function installCfgToAll\(/, '自动写入应支持多个 CS2 cfg 目录');
assert.match(main, /settings\.cfgPaths = normalizeCfgPaths\(cfgPaths\)/, '自动写入应保存所有成功写入的 cfg 路径');
assert.doesNotMatch(main, /const target = candidates\.find\(candidate => fs\.existsSync\(candidate\)\)/, '自动写入不能只选择第一个可用目录');
