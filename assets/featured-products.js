/**
 * Featured Products JavaScript
 * Handles carousel navigation and quick add to cart.
 *
 * v1.6 fixes:
 * - Arrow buttons scroll again. The old code set isAnimating = true and then
 *   called updateCarousel(), whose first line bailed out when isAnimating —
 *   so the scroll never ran. Navigation is now based on the grid's real
 *   scroll position instead of a fragile index + animation lock.
 * - cart:updated now dispatches { item_count } in detail, matching what the
 *   header badge listens for.
 * - Sections initialize exactly once (the old code created a second instance
 *   on shopify:section:load while the first one kept its listeners).
 * - Button/notification strings come from data attributes (translatable).
 */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------- Carousel ---------------- */

  function initCarousel(section) {
    var grid = section.querySelector('[data-fp-grid]');
    var nav = section.querySelector('[data-fp-nav]');
    if (!grid || !nav || section.dataset.layout !== 'carousel') return;

    var prevBtn = nav.querySelector('[data-fp-prev]');
    var nextBtn = nav.querySelector('[data-fp-next]');
    if (!prevBtn || !nextBtn) return;

    function step() {
      // One card width + gap, read from the real layout
      var item = grid.querySelector('.featured-products__item');
      if (!item) return 0;
      var gap = parseInt(getComputedStyle(grid).gap, 10) || 20;
      return item.getBoundingClientRect().width + gap;
    }

    function maxScroll() {
      return grid.scrollWidth - grid.clientWidth;
    }

    function updateButtons() {
      var overflow = maxScroll() > 2;
      nav.hidden = !overflow;
      if (!overflow) return;
      prevBtn.disabled = grid.scrollLeft <= 2;
      nextBtn.disabled = grid.scrollLeft >= maxScroll() - 2;
    }

    function scrollByStep(direction) {
      grid.scrollBy({
        left: direction * step(),
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
      });
    }

    prevBtn.addEventListener('click', function () { scrollByStep(-1); });
    nextBtn.addEventListener('click', function () { scrollByStep(1); });

    // Keep button states honest for clicks, swipes, and snapping
    var ticking = false;
    grid.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateButtons();
        ticking = false;
      });
    }, { passive: true });

    // Arrow-key support while the carousel controls are focused
    nav.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByStep(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByStep(1);
      }
    });

    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateButtons, 200);
    });

    updateButtons();
  }

  /* ---------------- Quick add ---------------- */

  function initQuickAdd(section) {
    var texts = {
      adding: section.dataset.textAdding || 'Adding…',
      added: section.dataset.textAdded || 'Added ✓',
      error: section.dataset.textError || 'Error',
      addedNotice: section.dataset.textAddedNotice || 'Product added to cart',
    };

    section.addEventListener('click', function (e) {
      var button = e.target.closest('.product-card__quick-add');
      if (!button || button.disabled) return;
      e.preventDefault();

      var variantId = button.dataset.variantId;
      if (!variantId) return;

      var originalText = button.textContent;
      button.textContent = texts.adding;
      button.disabled = true;

      var body = new FormData();
      body.append('id', variantId);
      body.append('quantity', 1);

      fetch('/cart/add.js', { method: 'POST', body: body, credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) {
            return response.json().then(function (data) {
              throw new Error(data.description || texts.error);
            });
          }
          return response.json();
        })
        .then(function (data) {
          button.textContent = texts.added;
          button.classList.add('product-card__quick-add--success');
          showNotification(texts.addedNotice, 'success');
          refreshCart();

          document.dispatchEvent(new CustomEvent('product:added', {
            detail: { product: data, variantId: variantId },
          }));

          resetButton(button, originalText);
        })
        .catch(function (error) {
          button.textContent = texts.error;
          button.classList.add('product-card__quick-add--error');
          showNotification(error.message || texts.error, 'error');
          resetButton(button, originalText);
        });
    });
  }

  function resetButton(button, originalText) {
    setTimeout(function () {
      button.textContent = originalText;
      button.disabled = false;
      button.classList.remove('product-card__quick-add--success', 'product-card__quick-add--error');
    }, 2000);
  }

  function refreshCart() {
    fetch('/cart.js')
      .then(function (response) { return response.json(); })
      .then(function (cart) {
        // Legacy selectors some themes use for the badge
        document.querySelectorAll('.cart-count, .cart__count, .cart-item-count').forEach(function (el) {
          el.textContent = cart.item_count;
        });

        // The header section listens for event.detail.item_count
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: { item_count: cart.item_count, cart: cart },
        }));
      })
      .catch(function (error) {
        console.error('Error fetching cart:', error);
      });
  }

  function showNotification(message, type) {
    if (window.theme && window.theme.notifications) {
      window.theme.notifications.show(message, type);
      return;
    }

    var existing = document.querySelector('.featured-products__notification');
    if (existing) existing.remove();

    var notification = document.createElement('div');
    notification.className = 'featured-products__notification featured-products__notification--' + (type || 'success');
    notification.setAttribute('role', 'status');
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(function () {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(function () { notification.remove(); }, 300);
    }, 3000);
  }

  /* ---------------- Init ---------------- */

  function initSection(section) {
    if (section.dataset.fpInit) return;
    section.dataset.fpInit = 'true';
    initCarousel(section);
    initQuickAdd(section);
  }

  function initAll(root) {
    var scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('[data-section-type="featured-products"]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  // Theme editor: the section's DOM is replaced, so initialize the new copy
  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();
