// 悬浮菜单渲染模块负责菜单展示和操作派发。
const { escapeHtml, applyThemeClass, applyAccentClass } = window.cs2Ui;
const menuTitle = document.querySelector('#menuTitle');
const menuList = document.querySelector('#menuList');

let currentSource = 'orb';

window.cs2FloatingMenu.onOpen(payload => {
  currentSource = payload.source || 'orb';
  applyTheme(payload.settings || {});
  renderMenu(payload);
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    window.cs2FloatingMenu.close();
  }
});

document.addEventListener('contextmenu', event => {
  event.preventDefault();
});

function applyTheme(settings) {
  const theme = settings.theme === 'dark' ? 'dark' : 'light';
  const accentColor = settings.accentColor || 'green';
  applyThemeClass(document.body, theme);
  applyAccentClass(document.body, accentColor);
}

function renderMenu(payload) {
  menuTitle.textContent = payload.title || '悬浮窗';
  const items = Array.isArray(payload.items) ? payload.items : [];
  menuList.innerHTML = items.map(item => `
    <button class="menu-item${item.danger ? ' is-danger' : ''}" type="button" data-action="${escapeHtml(item.id)}">
      <span>
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.hint || '')}</span>
      </span>
    </button>
  `).join('');
}

menuList.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  window.cs2FloatingMenu.runAction(currentSource, button.dataset.action);
});
