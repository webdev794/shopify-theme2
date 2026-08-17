(function () {
  'use strict';

  function init(section) {
    if (!section || section.dataset.psgInit) return;
    section.dataset.psgInit = 'true';

    var tabs = section.querySelectorAll('[data-psg-tab]');
    var panels = section.querySelectorAll('[data-psg-panel]');
    if (!tabs.length) return;

    function activate(index) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(function (panel, i) {
        var on = i === index;
        panel.classList.toggle('is-active', on);
        panel.hidden = !on;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activate(parseInt(tab.dataset.index, 10) || 0);
      });
      tab.addEventListener('keydown', function (e) {
        var i = parseInt(tab.dataset.index, 10) || 0;
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          var next = (i + 1) % tabs.length;
          tabs[next].focus();
          activate(next);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          var prev = (i - 1 + tabs.length) % tabs.length;
          tabs[prev].focus();
          activate(prev);
        }
      });
    });
  }

  function initAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-section-type="pet-size-guide"]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    initAll(e.target);
  });
})();
