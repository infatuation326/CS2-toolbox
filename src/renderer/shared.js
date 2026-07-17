// 渲染层公共模块提供文本转义和悬浮窗拖拽能力。
(() => {
  const accentColors = ['green', 'blue', 'amber', 'red', 'violet'];

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function bindFloatingDrag(target, moveBy) {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    target.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      dragging = true;
      lastX = event.screenX;
      lastY = event.screenY;
      target.setPointerCapture?.(event.pointerId);
    });

    target.addEventListener('pointermove', event => {
      if (!dragging) return;
      const dx = Math.round(event.screenX - lastX);
      const dy = Math.round(event.screenY - lastY);
      if (!dx && !dy) return;
      lastX = event.screenX;
      lastY = event.screenY;
      moveBy({ dx, dy });
    });

    const stopDragging = event => {
      dragging = false;
      if (event?.pointerId != null) target.releasePointerCapture?.(event.pointerId);
    };

    target.addEventListener('pointerup', stopDragging);
    target.addEventListener('pointercancel', stopDragging);
    target.addEventListener('lostpointercapture', () => {
      dragging = false;
    });
  }

  function applyThemeClass(target, theme) {
    target.classList.toggle('theme-light', theme === 'light');
    target.classList.toggle('theme-dark', theme !== 'light');
  }

  function applyAccentClass(target, accentColor) {
    const normalized = accentColors.includes(accentColor) ? accentColor : 'green';
    accentColors.forEach(color => {
      target.classList.toggle(`accent-${color}`, color === normalized);
    });
  }

  window.cs2Ui = Object.freeze({
    escapeHtml,
    bindFloatingDrag,
    applyThemeClass,
    applyAccentClass,
  });
})();
