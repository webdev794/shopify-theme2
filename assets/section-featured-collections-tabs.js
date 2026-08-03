(function () {
  function initTabs(section) {
    if (section.dataset.tabsInit === 'true') return;
    section.dataset.tabsInit = 'true';

    var buttons = Array.prototype.slice.call(
      section.querySelectorAll('.tab-button[data-tab]')
    );
    if (buttons.length === 0) return;

    function activate(button) {
      buttons.forEach(function (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
        btn.setAttribute('tabindex', '-1');
      });
      section.querySelectorAll('.tab-panel').forEach(function (panel) {
        panel.classList.remove('active');
      });

      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      button.setAttribute('tabindex', '0');

      var panel = section.querySelector(
        '.tab-panel[data-tab="' + CSS.escape(button.dataset.tab) + '"]'
      );
      if (panel) panel.classList.add('active');
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        activate(button);
      });

      // Arrow-key navigation for role="tablist"
      button.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var i = buttons.indexOf(button);
        var next =
          e.key === 'ArrowRight'
            ? buttons[(i + 1) % buttons.length]
            : buttons[(i - 1 + buttons.length) % buttons.length];
        next.focus();
        activate(next);
      });
    });
  }

  function initAll(root) {
    var scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('.featured-collections-tabs').forEach(initTabs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  // Theme editor re-renders sections; re-initialize when that happens
  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
})();
