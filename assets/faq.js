(function () {
  'use strict';

  function initFaq(section) {
    if (!section || section.dataset.faqInit) return;
    section.dataset.faqInit = 'true';

    var list = section.querySelector('[data-faq-list]');
    if (!list) return;

    // Close other items when one opens
    list.addEventListener(
      'toggle',
      function (e) {
        var item = e.target;
        if (!item.matches('[data-faq-item]') || !item.open) return;

        list.querySelectorAll('[data-faq-item][open]').forEach(function (other) {
          if (other !== item) other.removeAttribute('open');
        });
      },
      true
    );

    // Smoothly handle initial open state for first item (if open_first = true)
    // The animation will run on load; we ensure the answer is visible.
    // We also trigger a reflow to ensure the grid animation plays.
    var firstOpen = list.querySelector('[data-faq-item][open]');
    if (firstOpen) {
      // Force a small delay to let the browser paint the initial closed state
      // before opening, so the animation works.
      var wrapper = firstOpen.querySelector('.faq__answer-wrapper');
      if (wrapper) {
        // trigger reflow
        void wrapper.offsetHeight;
      }
    }
  }

  function initAll(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    root.querySelectorAll('[data-section-type="faq"]').forEach(initFaq);
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