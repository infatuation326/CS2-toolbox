// 渲染层公共能力测试覆盖文本转义和拖拽位移。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'shared.js'), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(source, context);

assert.strictEqual(context.window.cs2Ui.escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');

const listeners = new Map();
const moves = [];
const target = {
  addEventListener: (name, handler) => listeners.set(name, handler),
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
};

context.window.cs2Ui.bindFloatingDrag(target, delta => moves.push(delta));
listeners.get('pointerdown')({ button: 0, screenX: 10, screenY: 20, pointerId: 1 });
listeners.get('pointermove')({ screenX: 14, screenY: 27 });
listeners.get('pointerup')({ pointerId: 1 });
listeners.get('pointermove')({ screenX: 30, screenY: 40 });

assert.strictEqual(moves.length, 1);
assert.strictEqual(moves[0].dx, 4);
assert.strictEqual(moves[0].dy, 7);

const classes = new Set();
const themedTarget = {
  classList: {
    toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
  },
};

context.window.cs2Ui.applyThemeClass(themedTarget, 'dark');
context.window.cs2Ui.applyAccentClass(themedTarget, 'blue');
assert.strictEqual(classes.has('theme-dark'), true);
assert.strictEqual(classes.has('theme-light'), false);
assert.strictEqual(classes.has('accent-blue'), true);
assert.strictEqual(classes.has('accent-green'), false);

for (const [fileName, entryScript] of [
  ['index.html', 'app.js'],
  ['orb.html', 'orb.js'],
  ['monitorOverlay.html', 'monitorOverlay.js'],
  ['floatingMenu.html', 'floatingMenu.js'],
]) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', fileName), 'utf8');
  assert.ok(html.indexOf('shared.js') >= 0, `${fileName} 必须加载渲染层公共模块`);
  assert.ok(html.indexOf('shared.js') < html.indexOf(entryScript), `${fileName} 必须先加载渲染层公共模块`);
}
