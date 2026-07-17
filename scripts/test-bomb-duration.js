const fs = require('fs');
const assert = require('assert');

const main = fs.readFileSync('src/main/main.js', 'utf8');
const preload = fs.readFileSync('src/preload/preload.js', 'utf8');
const app = fs.readFileSync('src/renderer/app.js', 'utf8');
const orb = fs.readFileSync('src/renderer/orb.js', 'utf8');
const html = fs.readFileSync('src/renderer/index.html', 'utf8');

assert.match(main, /const defaultBombDurationSec = 38;/, '默认 C4 时间应为 38 秒');
assert.match(main, /bombDurationSec: defaultBombDurationSec,/, '默认设置应保存 C4 时间');
assert.match(main, /settings:set-bomb-duration/, '主进程应提供 C4 时间设置 IPC');
assert.match(preload, /setBombDuration/, 'preload 应暴露 C4 时间设置接口');
assert.match(app, /bombDurationSelect/, '渲染层应绑定 C4 时间控件');
assert.match(html, /id="bombDurationSelect"/, '设置页应提供 C4 时间控件');
assert.match(html, /<option value="38" selected>38 秒<\/option>/, '设置页默认选项应为 38 秒');
assert.doesNotMatch(app, /const bombDurationMs = 38000;/, '渲染层不应再写死 38 秒');
assert.match(orb, /const defaultBombDurationMs = 38000;/, '悬浮球默认兜底应为 38 秒');
