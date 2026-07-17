// 动画策略测试确保仅由软件低配置模式关闭动态效果。
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const files = [
  'src/renderer/app.js',
  'src/renderer/orb.js',
  'src/renderer/styles.css',
  'src/renderer/orb.css',
  'src/renderer/monitorOverlay.css',
];

const source = files
  .map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))
  .join('\n');

assert.strictEqual(source.includes('prefers-reduced-motion'), false, '完整动画模式不应受系统动画开关限制');
assert.match(source, /low-performance-mode[\s\S]*animation:\s*none\s*!important/);
