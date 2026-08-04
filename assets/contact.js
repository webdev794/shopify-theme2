(function () {
  'use strict';

  function init(section) {
    if (!section || section.dataset.contactInit) return;
    section.dataset.contactInit = 'true';

    var form = section.querySelector('.contact__form');
    if (!form) return;

    form.addEventListener('submit', function () {
      var btn = form.querySelector('.contact__submit');
      if (btn && !btn.disabled) {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = btn.dataset.sending || 'Sending…';
        btn.disabled = true;
      }
    });
  }

  function initAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-section-type="contact"]').forEach(init);
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
