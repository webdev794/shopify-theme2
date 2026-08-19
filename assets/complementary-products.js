(function () {
  'use strict';

  function init(placeholder) {
    if (!placeholder || placeholder.dataset.complementaryInit) return;
    placeholder.dataset.complementaryInit = 'true';

    var wrapper = placeholder.closest('.product__complementary');
    if (!wrapper) return;

    var url = wrapper.dataset.url;
    if (!url) return;

    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const grid = doc.querySelector('.product-recommendations__grid');

        if (grid && grid.children.length > 0) {
          placeholder.replaceWith(grid);
          grid.classList.add('product__complementary-grid');
        } else {
          // No complementary products configured for this product — hide the whole block
          wrapper.remove();
        }
      })
      .catch(() => {
        wrapper.remove();
      });
  }

  function initAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[data-complementary-placeholder]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();
