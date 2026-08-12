/* =========================================================
   PETLIO — SHOPPABLE LOOKBOOK
   Chapter 06 interactions
   ========================================================= */

(function () {
  'use strict';

  var initializedSections = new WeakSet();

  

  /*
   * -------------------------------------------------------
   * ADD TO CART (single + all)
   * -------------------------------------------------------
   */

  function addItemsToCart(items, button) {
    if (!items || !items.length) return Promise.resolve();

    var label = button ? button.textContent : '';
    if (button) {
      button.classList.add('is-loading');
      button.textContent = 'Adding…';
    }

    var utils = window.ThemeUtils || (window.theme && window.theme.utils);
    var promise;

    if (utils && typeof utils.addToCart === 'function') {
      promise = utils.addToCart(items.map(function (id) {
        return { id: Number(id), quantity: 1 };
      }));
    } else {
      promise = fetch((window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/' + 'cart/add.js'.replace(/\/\//, '/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          items: items.map(function (id) {
            return { id: Number(id), quantity: 1 };
          })
        })
      }).then(function (res) {
        if (!res.ok) throw new Error('Add failed');
        return res.json();
      });
    }

    return promise
      .then(function () {
        if (button) {
          button.classList.remove('is-loading');
          button.classList.add('is-added');
          button.textContent = 'Added';
          setTimeout(function () {
            button.classList.remove('is-added');
            button.textContent = label;
          }, 1800);
        }
        // Refresh cart drawer if present
        function afterAdd(cart) {
          if (utils && utils.publishCart && cart) utils.publishCart(cart);
          document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: cart } }));
          document.dispatchEvent(new CustomEvent('product:added', { detail: { cart: cart } }));
          document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { cart: cart } }));
          if (window.PetlioToast && PetlioToast.show) {
            var count = items && items.length > 1 ? items.length + ' items added to cart' : 'Added to cart';
            PetlioToast.show(count, { withCartLink: true });
          }
        }
        if (utils && typeof utils.getCart === 'function') {
          utils.getCart().then(afterAdd).catch(function () { afterAdd(null); });
        } else {
          fetch('/cart.js').then(function (r) { return r.json(); }).then(afterAdd).catch(function () { afterAdd(null); });
        }
      })
      .catch(function () {
        if (button) {
          button.classList.remove('is-loading');
          button.textContent = 'Try again';
          setTimeout(function () {
            button.textContent = label;
          }, 1600);
        }
      });
  }

  function bindCartActions(section) {
    section.querySelectorAll('[data-lookbook-add]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-variant-id');
        if (id) addItemsToCart([id], btn);
      });
    });

    var addAll = section.querySelector('[data-lookbook-add-all]');
    if (addAll && !addAll.dataset.bound) {
      addAll.dataset.bound = '1';
      addAll.addEventListener('click', function (e) {
        e.preventDefault();
        var raw = addAll.getAttribute('data-variant-ids') || '';
        var ids = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        addItemsToCart(ids, addAll);
      });
    }
  }


  function initLookbook(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);
    bindCartActions(section);

    var hotspots = Array.from(
      section.querySelectorAll('[data-hotspot]')
    );

    if (!hotspots.length) {
      return;
    }

    /*
     * -------------------------------------------------------
     * CLOSE ALL
     * -------------------------------------------------------
     */

    function closeAll(except) {
      hotspots.forEach(function (hotspot) {
        if (hotspot === except) {
          return;
        }

        var button = hotspot.querySelector(
          '[data-hotspot-button]'
        );

        var card = hotspot.querySelector(
          '[data-product-card]'
        );

        if (button) {
          button.setAttribute(
            'aria-expanded',
            'false'
          );
        }

        if (card) {
          card.hidden = true;
        }

        hotspot.classList.remove('is-active');
      });
    }

    /*
     * -------------------------------------------------------
     * TOGGLE HOTSPOT
     * -------------------------------------------------------
     */

    function toggleHotspot(hotspot) {
      var button = hotspot.querySelector(
        '[data-hotspot-button]'
      );

      var card = hotspot.querySelector(
        '[data-product-card]'
      );

      if (!button || !card) {
        return;
      }

      var isOpen =
        button.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        button.setAttribute(
          'aria-expanded',
          'false'
        );

        card.hidden = true;

        hotspot.classList.remove(
          'is-active'
        );

        return;
      }

      closeAll(hotspot);

      button.setAttribute(
        'aria-expanded',
        'true'
      );

      card.hidden = false;

      hotspot.classList.add(
        'is-active'
      );
    }

    /*
     * -------------------------------------------------------
     * EVENTS
     * -------------------------------------------------------
     */

    hotspots.forEach(function (hotspot) {
      var button = hotspot.querySelector(
        '[data-hotspot-button]'
      );

      var closeButton = hotspot.querySelector(
        '[data-product-close]'
      );

      if (button) {
        button.addEventListener(
          'click',
          function (event) {
            event.preventDefault();

            toggleHotspot(hotspot);
          }
        );
      }

      if (closeButton) {
        closeButton.addEventListener(
          'click',
          function (event) {
            event.preventDefault();

            var hotspotButton =
              hotspot.querySelector(
                '[data-hotspot-button]'
              );

            var card =
              hotspot.querySelector(
                '[data-product-card]'
              );

            if (hotspotButton) {
              hotspotButton.setAttribute(
                'aria-expanded',
                'false'
              );
            }

            if (card) {
              card.hidden = true;
            }

            hotspot.classList.remove(
              'is-active'
            );
          }
        );
      }
    });

    /*
     * -------------------------------------------------------
     * CLICK OUTSIDE
     * -------------------------------------------------------
     */

    document.addEventListener(
      'click',
      function (event) {
        if (
          !section.contains(event.target)
        ) {
          return;
        }

        if (
          event.target.closest(
            '[data-hotspot]'
          )
        ) {
          return;
        }

        closeAll();
      }
    );

    /*
     * -------------------------------------------------------
     * ESCAPE KEY
     * -------------------------------------------------------
     */

    section.addEventListener(
      'keydown',
      function (event) {
        if (event.key !== 'Escape') {
          return;
        }

        closeAll();
      }
    );

    /*
     * -------------------------------------------------------
     * KEYBOARD NAVIGATION
     * -------------------------------------------------------
     */

    hotspots.forEach(function (hotspot, index) {
      var button = hotspot.querySelector(
        '[data-hotspot-button]'
      );

      if (!button) {
        return;
      }

      button.addEventListener(
        'keydown',
        function (event) {
          if (
            event.key !== 'ArrowRight' &&
            event.key !== 'ArrowDown' &&
            event.key !== 'ArrowLeft' &&
            event.key !== 'ArrowUp'
          ) {
            return;
          }

          event.preventDefault();

          var nextIndex;

          if (
            event.key === 'ArrowRight' ||
            event.key === 'ArrowDown'
          ) {
            nextIndex = index + 1;

            if (
              nextIndex >= hotspots.length
            ) {
              nextIndex = 0;
            }
          } else {
            nextIndex = index - 1;

            if (nextIndex < 0) {
              nextIndex =
                hotspots.length - 1;
            }
          }

          var nextButton =
            hotspots[nextIndex].querySelector(
              '[data-hotspot-button]'
            );

          if (nextButton) {
            nextButton.focus();
          }
        }
      );
    });

    /*
     * -------------------------------------------------------
     * MOBILE CARD POSITIONING
     * -------------------------------------------------------
     *
     * Prevents product cards from extending beyond
     * the scene on smaller screens.
     */

    function positionCards() {
      var isMobile =
        window.matchMedia(
          '(max-width: 749px)'
        ).matches;

      hotspots.forEach(function (hotspot) {
        var card = hotspot.querySelector(
          '[data-product-card]'
        );

        if (!card) {
          return;
        }

        card.style.removeProperty(
          'left'
        );

        card.style.removeProperty(
          'right'
        );

        if (!isMobile) {
          return;
        }

        var hotspotRect =
          hotspot.getBoundingClientRect();

        var sectionRect =
          section.getBoundingClientRect();

        var cardWidth =
          card.offsetWidth || 280;

        var leftEdge =
          hotspotRect.left -
          sectionRect.left;

        var rightEdge =
          sectionRect.right -
          hotspotRect.right;

        /*
         * If the hotspot is on the right side,
         * open the card toward the left.
         */

        if (
          rightEdge < cardWidth + 30
        ) {
          card.style.left = 'auto';
          card.style.right = '29px';
        } else {
          card.style.left = '29px';
          card.style.right = 'auto';
        }
      });
    }

    window.addEventListener(
      'resize',
      positionCards,
      { passive: true }
    );

    positionCards();
  }

  /*
   * -------------------------------------------------------
   * INITIALIZE ALL
   * -------------------------------------------------------
   */

  function initAll(root) {
    root = root || document;

    var sections = root.querySelectorAll(
      '[data-section-type="lookbook"]'
    );

    sections.forEach(function (section) {
      initLookbook(section);
    });
  }

  /*
   * -------------------------------------------------------
   * PAGE LOAD
   * -------------------------------------------------------
   */

  if (
    document.readyState === 'loading'
  ) {
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
   * -------------------------------------------------------
   * SHOPIFY THEME EDITOR
   * -------------------------------------------------------
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