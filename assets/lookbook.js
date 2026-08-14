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

  function parseVariantIds(raw) {
    if (Array.isArray(raw)) {
      return raw.map(function (v) { return Number(v); }).filter(function (id) { return id && !isNaN(id) && id > 0; });
    }
    return String(raw || '')
      .split(',')
      .map(function (s) { return Number(String(s).trim()); })
      .filter(function (id) { return id && !isNaN(id) && id > 0; });
  }

  function addItemsToCart(rawIds, button) {
    var ids = parseVariantIds(rawIds);
    if (!ids.length) {
      if (window.PetlioToast && PetlioToast.show) {
        PetlioToast.show('No available products to add');
      }
      return Promise.resolve();
    }

    var label = button ? button.textContent : '';
    if (button) {
      button.classList.add('is-loading');
      button.textContent = 'Adding…';
    }

    var utils = window.ThemeUtils || (window.theme && window.theme.utils);
    var items = ids.map(function (id) { return { id: id, quantity: 1 }; });

    var promise = (utils && typeof utils.addToCart === 'function')
      ? utils.addToCart(items)
      : (function () {
          var chain = Promise.resolve();
          items.forEach(function (item) {
            chain = chain.then(function () {
              return fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ items: [item] })
              }).then(function (res) {
                if (!res.ok) {
                  return res.json().catch(function () { return {}; }).then(function (data) {
                    console.warn('[Petlio] add failed', item.id, data);
                  });
                }
              }).catch(function () {});
            });
          });
          return chain.then(function () {
            return fetch('/cart.js', { credentials: 'same-origin' }).then(function (r) { return r.json(); });
          });
        })();

    return promise
      .then(function (cart) {
        function finishWithCart(cartData) {
          if (!cartData) {
            return fetch('/cart.js', { credentials: 'same-origin' })
              .then(function (r) { return r.json(); })
              .then(finishWithCart)
              .catch(function () {});
          }
          if (utils && utils.publishCart) utils.publishCart(cartData);
          document.dispatchEvent(new CustomEvent('cart:updated', {
            detail: { item_count: cartData.item_count, cart: cartData }
          }));
          document.dispatchEvent(new CustomEvent('cart:refresh', {
            detail: { item_count: cartData.item_count, cart: cartData }
          }));
          if (window.PetlioToast && PetlioToast.show) {
            var msg = ids.length > 1 ? (ids.length + ' items added to cart') : 'Added to cart';
            PetlioToast.show(msg, { withCartLink: true });
          }
          try {
            var n = typeof cartData.item_count === 'number' ? cartData.item_count : null;
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

        fetch('/cart.js', { credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(finishWithCart)
          .catch(function () { finishWithCart(cart); });

        if (button) {
          button.classList.remove('is-loading');
          button.classList.add('is-added');
          button.textContent = 'Added';
          setTimeout(function () {
            button.classList.remove('is-added');
            button.textContent = label;
          }, 1800);
        }
      })
      .catch(function (err) {
        console.error('[Petlio] add to cart failed', err);
        if (button) {
          button.classList.remove('is-loading');
          button.textContent = 'Try again';
          setTimeout(function () { button.textContent = label; }, 1800);
        }
        var msg = (err && err.data && (err.data.description || err.data.message)) || (err && err.message) || 'Could not add to cart';
        if (window.PetlioToast && PetlioToast.show) {
          PetlioToast.show(msg);
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
        addItemsToCart(raw, addAll);
      });
    }
  }

  function initLookbook(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);
    bindCartActions(section);

    var hotspots = Array.from(section.querySelectorAll('[data-hotspot]'));
    var mobileCards = Array.from(section.querySelectorAll('[data-mobile-card]'));
    var isMobile = window.matchMedia('(max-width: 749px)').matches;

    if (!hotspots.length) {
      return;
    }

    /*
     * -------------------------------------------------------
     * CLOSE ALL (desktop only)
     * -------------------------------------------------------
     */

    function closeAll(except) {
      hotspots.forEach(function (hotspot) {
        if (hotspot === except) return;

        var button = hotspot.querySelector('[data-hotspot-button]');
        var card = hotspot.querySelector('[data-product-card]');

        if (button) button.setAttribute('aria-expanded', 'false');
        if (card) card.hidden = true;
        hotspot.classList.remove('is-active');
      });
    }

    /*
     * -------------------------------------------------------
     * MOBILE: highlight + scroll to card
     * -------------------------------------------------------
     */

    function highlightMobileCard(index) {
      mobileCards.forEach(function (card) {
        card.classList.remove('is-highlighted');
      });

      var target = mobileCards.find(function (card) {
        return card.getAttribute('data-hotspot-index') === String(index);
      });

      if (target) {
        target.classList.add('is-highlighted');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove highlight after a short time
        setTimeout(function () {
          target.classList.remove('is-highlighted');
        }, 2200);
      }
    }

    /*
     * -------------------------------------------------------
     * TOGGLE HOTSPOT
     * -------------------------------------------------------
     */

    function toggleHotspot(hotspot) {
      var button = hotspot.querySelector('[data-hotspot-button]');
      var card = hotspot.querySelector('[data-product-card]');
      var index = hotspot.getAttribute('data-hotspot-index');

      if (!button) return;

      // On mobile → just highlight the corresponding list card
      if (window.matchMedia('(max-width: 749px)').matches) {
        highlightMobileCard(index);
        // Also toggle the + visual on the hotspot
        var isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        // Reset other hotspots
        hotspots.forEach(function (h) {
          if (h !== hotspot) {
            var b = h.querySelector('[data-hotspot-button]');
            if (b) b.setAttribute('aria-expanded', 'false');
            h.classList.remove('is-active');
          }
        });
        hotspot.classList.toggle('is-active', !isOpen);
        return;
      }

      // Desktop behaviour (floating card)
      if (!card) return;

      var isOpen = button.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        button.setAttribute('aria-expanded', 'false');
        card.hidden = true;
        hotspot.classList.remove('is-active');
        return;
      }

      closeAll(hotspot);

      button.setAttribute('aria-expanded', 'true');
      card.hidden = false;
      hotspot.classList.add('is-active');
    }

    /*
     * -------------------------------------------------------
     * EVENTS
     * -------------------------------------------------------
     */

    hotspots.forEach(function (hotspot) {
      var button = hotspot.querySelector('[data-hotspot-button]');
      var closeButton = hotspot.querySelector('[data-product-close]');

      if (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          toggleHotspot(hotspot);
        });
      }

      if (closeButton) {
        closeButton.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();

          var hotspotButton = hotspot.querySelector('[data-hotspot-button]');
          var card = hotspot.querySelector('[data-product-card]');

          if (hotspotButton) hotspotButton.setAttribute('aria-expanded', 'false');
          if (card) card.hidden = true;
          hotspot.classList.remove('is-active');
        });
      }
    });

    // Click outside (desktop)
    document.addEventListener('click', function (event) {
      if (!section.contains(event.target)) return;
      if (event.target.closest('[data-hotspot]')) return;
      if (window.matchMedia('(max-width: 749px)').matches) return;
      closeAll();
    });

    // Escape
    section.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll();
    });

    // Keyboard navigation between hotspots
    hotspots.forEach(function (hotspot, index) {
      var button = hotspot.querySelector('[data-hotspot-button]');
      if (!button) return;

      button.addEventListener('keydown', function (event) {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();

        var nextIndex = (event.key === 'ArrowRight' || event.key === 'ArrowDown')
          ? (index + 1) % hotspots.length
          : (index - 1 + hotspots.length) % hotspots.length;

        var nextButton = hotspots[nextIndex].querySelector('[data-hotspot-button]');
        if (nextButton) nextButton.focus();
      });
    });
  }

  /*
   * -------------------------------------------------------
   * INITIALIZE ALL
   * -------------------------------------------------------
   */

  function initAll(root) {
    root = root || document;
    var sections = root.querySelectorAll('[data-section-type="lookbook"]');
    sections.forEach(function (section) {
      initLookbook(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
  document.addEventListener('shopify:section:reorder', function () {
    initAll(document);
  });
  document.addEventListener('shopify:section:select', function (event) {
    initAll(event.target);
  });

})();
