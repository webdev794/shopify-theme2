/* =========================================================
   PETLIO — LOOKBOOK GALLERY
   Chapter 05 interaction
   ========================================================= */

(function () {
  'use strict';

  var initializedSections = new WeakSet();

  
  function galleryAddToCart(ids, button) {
    if (!ids || !ids.length) return;
    var label = button ? button.textContent : '';
    if (button) {
      button.classList.add('is-loading');
      if (button.matches('[data-look-add-all]')) button.textContent = 'Adding…';
      else button.classList.add('is-adding');
    }
    var utils = window.ThemeUtils || (window.theme && window.theme.utils);
    var items = ids.map(function (id) { return { id: Number(id), quantity: 1 }; });
    var promise = (utils && utils.addToCart)
      ? utils.addToCart(items)
      : fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: items })
        }).then(function (r) { if (!r.ok) throw new Error('fail'); return r.json(); });

    promise.then(function () {
      if (button) {
        button.classList.remove('is-loading', 'is-adding');
        button.classList.add('is-added');
        if (button.matches('[data-look-add-all]')) {
          button.textContent = 'Added';
          setTimeout(function () {
            button.classList.remove('is-added');
            button.textContent = label;
          }, 1800);
        } else {
          setTimeout(function () { button.classList.remove('is-added'); }, 1600);
        }
      }
        function afterAdd(cart) {
          // Update cart count / listeners without opening the drawer
          if (utils && utils.publishCart && cart) utils.publishCart(cart);
          document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart } }));
          document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { cart: cart } }));
          // Toast confirmation only (drawer was opening empty)
          if (window.PetlioToast && PetlioToast.show) {
            var msg = items && items.length > 1 ? (items.length + ' items added to cart') : 'Added to cart';
            PetlioToast.show(msg, { withCartLink: true });
          }
          // Update header cart count badge if present
          try {
            var n = cart && typeof cart.item_count === 'number' ? cart.item_count : null;
            if (n !== null) {
              document.querySelectorAll('[data-cart-count], [data-cart-drawer-count], .cart-count, .header__cart-count').forEach(function (el) {
                el.textContent = n > 0 ? String(n) : '';
                el.hidden = n <= 0;
                if (n > 0) el.classList.remove('hidden');
                else el.classList.add('hidden');
              });
            }
          } catch (err) {}
        }
        if (utils && typeof utils.getCart === 'function') {
          utils.getCart().then(afterAdd).catch(function () { afterAdd(null); });
        } else {
          fetch('/cart.js').then(function (r) { return r.json(); }).then(afterAdd).catch(function () { afterAdd(null); });
        }
    }).catch(function () {
      if (button) {
        button.classList.remove('is-loading', 'is-adding');
        if (button.matches('[data-look-add-all]')) {
          button.textContent = 'Try again';
          setTimeout(function () { button.textContent = label; }, 1500);
        }
      }
    });
  }

  function bindGalleryCart(section) {
    section.querySelectorAll('[data-look-add]').forEach(function (btn) {
      if (btn.dataset.boundCart) return;
      btn.dataset.boundCart = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-variant-id');
        var available = btn.getAttribute('data-available');
        if (available === 'false') return;
        if (id) galleryAddToCart([id], btn);
      });
    });
    section.querySelectorAll('[data-look-add-all]').forEach(function (btn) {
      if (btn.dataset.boundCart) return;
      btn.dataset.boundCart = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var raw = btn.getAttribute('data-variant-ids') || '';
        var ids = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        galleryAddToCart(ids, btn);
      });
    });
  }


  function initLookbookGallery(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);
    bindGalleryCart(section);

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