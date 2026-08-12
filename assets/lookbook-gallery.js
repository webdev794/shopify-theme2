/* =========================================================
   PETLIO — LOOKBOOK GALLERY
   Chapter 05 interaction
   ========================================================= */

(function () {
  'use strict';

  var initializedSections = new WeakSet();

  function initLookbookGallery(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);

    var looks = Array.from(
      section.querySelectorAll('[data-look]')
    );

    if (!looks.length) {
      return;
    }

    /*
     * -------------------------------------------------------
     * PRODUCT HOVER / FOCUS
     * -------------------------------------------------------
     *
     * When one product is focused, the other products
     * become slightly quieter. This creates the feeling
     * of discovering objects within one scene.
     */

    looks.forEach(function (look) {
      var products = Array.from(
        look.querySelectorAll('[data-look-product]')
      );

      products.forEach(function (product) {
        product.addEventListener('mouseenter', function () {
          products.forEach(function (other) {
            if (other !== product) {
              other.classList.add('is-dimmed');
            }
          });
        });

        product.addEventListener('mouseleave', function () {
          products.forEach(function (other) {
            other.classList.remove('is-dimmed');
          });
        });

        product.addEventListener('focus', function () {
          products.forEach(function (other) {
            if (other !== product) {
              other.classList.add('is-dimmed');
            }
          });
        });

        product.addEventListener('blur', function () {
          products.forEach(function (other) {
            other.classList.remove('is-dimmed');
          });
        });
      });
    });

    /*
     * -------------------------------------------------------
     * SCROLL REVEAL
     * -------------------------------------------------------
     *
     * Uses IntersectionObserver when available.
     * The CSS remains fully usable without JS.
     */

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -8% 0px'
        }
      );

      looks.forEach(function (look) {
        observer.observe(look);
      });
    } else {
      looks.forEach(function (look) {
        look.classList.add('is-visible');
      });
    }

    /*
     * -------------------------------------------------------
     * OPTIONAL KEYBOARD SUPPORT
     * -------------------------------------------------------
     *
     * Makes the product objects feel like interactive
     * hotspots even though they are normal links.
     */

    looks.forEach(function (look) {
      var products = Array.from(
        look.querySelectorAll('[data-look-product]')
      );

      products.forEach(function (product, index) {
        product.addEventListener('keydown', function (event) {
          if (event.key !== 'ArrowRight' &&
              event.key !== 'ArrowDown' &&
              event.key !== 'ArrowLeft' &&
              event.key !== 'ArrowUp') {
            return;
          }

          event.preventDefault();

          var nextIndex;

          if (
            event.key === 'ArrowRight' ||
            event.key === 'ArrowDown'
          ) {
            nextIndex = index + 1;

            if (nextIndex >= products.length) {
              nextIndex = 0;
            }
          } else {
            nextIndex = index - 1;

            if (nextIndex < 0) {
              nextIndex = products.length - 1;
            }
          }

          products[nextIndex].focus();
        });
      });
    });
  }

  /*
   * ---------------------------------------------------------
   * INITIALIZE
   * ---------------------------------------------------------
   */

  function initAll(root) {
    root = root || document;

    var sections = root.querySelectorAll(
      '[data-section-type="lookbook-gallery"]'
    );

    sections.forEach(function (section) {
      initLookbookGallery(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        initAll(document);
      }
    );
  } else {
    initAll(document);
  }

  /*
   * ---------------------------------------------------------
   * SHOPIFY THEME EDITOR SUPPORT
   * ---------------------------------------------------------
   */

  document.addEventListener(
    'shopify:section:load',
    function (event) {
      initAll(event.target);
    }
  );

  document.addEventListener(
    'shopify:section:reorder',
    function () {
      initAll(document);
    }
  );

  document.addEventListener(
    'shopify:section:select',
    function (event) {
      initAll(event.target);
    }
  );

})();