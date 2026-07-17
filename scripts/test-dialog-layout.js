// 弹窗布局测试确保外层容器与内部面板使用一致宽度。
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rendererDir = path.join(__dirname, '..', 'src', 'renderer');
const css = fs.readFileSync(path.join(rendererDir, 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(rendererDir, 'index.html'), 'utf8');
const dialogNames = ['custom', 'confirm', 'close-choice', 'donation', 'online-notice', 'setup-guide'];

assert.strictEqual(css.includes('width: min(640px'), false, '弹窗内部面板不能使用固定宽度');
assert.match(
  css,
  /\.custom-dialog__panel,[\s\S]*\.setup-guide-dialog__panel\s*\{[\s\S]*width:\s*100%;[\s\S]*min-width:\s*0;[\s\S]*max-width:\s*100%;/
);

dialogNames.forEach(name => {
  assert.ok(html.includes(`class="${name}-dialog"`), `${name} 弹窗缺少外层容器`);
  assert.ok(html.includes(`class="${name}-dialog__panel"`), `${name} 弹窗缺少内部面板`);
});
