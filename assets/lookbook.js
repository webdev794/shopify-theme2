// ========== LOOKBOOK JAVASCRIPT ==========
// Hotspot popover behavior: one open at a time, close on outside click
// and Escape, aria-expanded kept in sync. Popovers still work without
// this file thanks to native <details> behavior.
//
// New: "Shop the whole look" batch add to cart using Shopify's
// /cart/add.js endpoint with an items array.

(() => {

  /* Sticky scroll-zoom: scale media from --lookbook-zoom-start to 1
     as the tall track is scrolled through the viewport. */
  const initScrollZoom = (section) => {
    if (!section.hasAttribute('data-scroll-zoom')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Scroll-zoom is disabled on mobile via CSS; skip JS work too
    if (window.matchMedia('(max-width: 749px)').matches) return;

    const track = section.querySelector('.lookbook__scroll-track');
    const target = section.querySelector('.lookbook__scale-target');
    if (!track || !target) return;

    const startScale = (() => {
      const raw = getComputedStyle(section).getPropertyValue('--lookbook-zoom-start').trim();
      const n = parseFloat(raw);
      return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.55;
    })();

    let ticking = false;

    const update = () => {
      const rect = track.getBoundingClientRect();
      const trackHeight = track.offsetHeight;
      const viewH = window.innerHeight || document.documentElement.clientHeight;
      const scrollable = Math.max(trackHeight - viewH, 1);

      // Start zoom as soon as the section header enters the viewport
      // (track top at bottom of screen). Finish when sticky has scrolled
      // through ~30% of its range, then HOLD full size for the rest.
      const zoomStart = viewH;          // rect.top when header first visible
      const zoomEndAt = -scrollable * 0.30; // rect.top when scale should be 1
      const range = zoomStart - zoomEndAt;
      const progress = Math.min(1, Math.max(0, (zoomStart - rect.top) / range));
      const scale = startScale + (1 - startScale) * progress;
      target.style.transform = 'scale(' + scale + ')';
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  };

  const initSection = (section) => {
    if (section.dataset.lookbookInit) return;
    section.dataset.lookbookInit = 'true';

    // ---- Scroll zoom (sticky gallery) ----
    initScrollZoom(section);

    const hotspots = section.querySelectorAll('[data-lookbook-hotspot]');

    // ---- Popover behavior (only when hotspots exist) ----
    const closeAll = (except) => {
      hotspots.forEach((hotspot) => {
        if (hotspot !== except) hotspot.removeAttribute('open');
      });
    };

    if (hotspots.length) {
      hotspots.forEach((hotspot) => {
        const summary = hotspot.querySelector(':scope > summary');
        if (summary) summary.setAttribute('aria-expanded', String(hotspot.open));

        hotspot.addEventListener('toggle', () => {
          if (summary) summary.setAttribute('aria-expanded', String(hotspot.open));
          if (hotspot.open) closeAll(hotspot);
        });
      });

      section.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const openHotspot = event.target.closest('details[open]');
        if (openHotspot) {
          openHotspot.removeAttribute('open');
          const summary = openHotspot.querySelector('summary');
          if (summary) summary.focus();
        }
      });

      document.addEventListener('click', (event) => {
        if (!section.contains(event.target)) closeAll();
      });
    }

    // ---- "Shop the Whole Look" batch add to cart ----
    const wholeLookBtn = section.querySelector('[data-whole-look-btn]');
    const addIndividualForms = section.querySelectorAll('[data-add-individual]');

    if (wholeLookBtn) {
      wholeLookBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        const addToCartButtons = section.querySelectorAll('[data-add-to-cart]');
        const items = [];
        let hasMissingVariant = false;

        addToCartButtons.forEach((btn) => {
          const variantId = btn.dataset.variantId;
          const quantity = parseInt(btn.dataset.quantity || '1', 10);
          if (variantId) {
            items.push({
              id: parseInt(variantId, 10),
              quantity: quantity,
            });
          } else {
            hasMissingVariant = true;
          }
        });

        if (items.length === 0 || hasMissingVariant) {
          showFeedback(section, 'Please select a size for each product.', 'error');
          return;
        }

        try {
          wholeLookBtn.disabled = true;
          wholeLookBtn.dataset.label = wholeLookBtn.dataset.label || wholeLookBtn.textContent; wholeLookBtn.textContent = 'Adding...';

          // Use the cart add endpoint with items array
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ items: items }),
          });

          if (!response.ok) {
            let errorMessage = 'Failed to add items to cart';
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              // If response isn't JSON, use status text
              errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          const cart = await response.json();
          showFeedback(section, `Added ${items.length} items to your cart!`, 'success');
          
          // Update cart count if your theme has a cart count element
          updateCartCount(cart);
          
          // Optional: Open cart drawer if your theme has one
          const cartDrawer = document.querySelector('[data-cart-drawer]');
          if (cartDrawer && typeof cartDrawer.open === 'function') {
            cartDrawer.open();
          }

          // Dispatch a custom event for other scripts to listen to
          document.dispatchEvent(new CustomEvent('lookbook:added-to-cart', {
            detail: { cart, items }
          }));

          // Close all popovers after adding
          closeAll();

        } catch (error) {
          console.error('Lookbook add to cart error:', error);
          showFeedback(section, error.message || 'Something went wrong. Please try again.', 'error');
        } finally {
          wholeLookBtn.disabled = false;
          wholeLookBtn.textContent = wholeLookBtn.dataset.label || 'Complete the Look';
        }
      });
    }

    // ---- Individual add-to-cart forms with variant selection ----
    addIndividualForms.forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const variantId = formData.get('id');

        if (!variantId) {
          showFeedback(section, 'Please select a size.', 'error');
          return;
        }

        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Adding...';

          const response = await fetch('/cart/add.js', {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            let errorMessage = 'Failed to add item to cart';
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
          }

          const cart = await response.json();
          showFeedback(section, 'Added to cart!', 'success');
          updateCartCount(cart);

          // Dispatch custom event
          document.dispatchEvent(new CustomEvent('lookbook:added-to-cart', {
            detail: { cart, items: [{ id: parseInt(variantId, 10), quantity: 1 }] }
          }));

        } catch (error) {
          console.error('Individual add to cart error:', error);
          showFeedback(section, error.message || 'Something went wrong.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    });

    // ---- Variant selection updates ----
    const variantSelectors = section.querySelectorAll('[data-variant-select]');
    variantSelectors.forEach((select) => {
      select.addEventListener('change', (event) => {
        const container = event.target.closest('[data-product-container]');
        if (!container) return;

        const addBtn = container.querySelector('[data-add-to-cart]');
        const requiresVariant = container.querySelector('[data-requires-variant]');
        const variantId = event.target.value;
        const variantInput = container.querySelector('[data-variant-input]');

        if (addBtn) {
          addBtn.dataset.variantId = variantId;
          addBtn.disabled = !variantId;
          // Update button text based on selection
          if (variantId) {
            addBtn.textContent = 'Add to Cart';
          } else {
            addBtn.textContent = 'Select size first';
          }
        }

        if (variantInput) {
          variantInput.value = variantId || '';
        }

        if (requiresVariant) {
          requiresVariant.style.display = variantId ? 'none' : 'block';
        }

        // Update price display if available
        const priceDisplay = container.querySelector('[data-price-display]');
        if (priceDisplay) {
          const selectedOption = event.target.options[event.target.selectedIndex];
          const price = selectedOption ? selectedOption.dataset.price : null;
          if (price) {
            priceDisplay.textContent = price;
          }
        }
      });

      // Trigger initial state
      select.dispatchEvent(new Event('change'));
    });

    // ---- Helper: Show feedback message ----
    function showFeedback(container, message, type = 'info') {
      const existing = container.querySelector('[data-lookbook-feedback]');
      if (existing) existing.remove();

      const feedback = document.createElement('div');
      feedback.dataset.lookbookFeedback = true;
      feedback.className = `lookbook__feedback lookbook__feedback--${type}`;
      feedback.textContent = message;
      feedback.setAttribute('role', 'alert');

      // Position feedback near the "Shop the Whole Look" button
      const btn = container.querySelector('[data-whole-look-btn]');
      if (btn) {
        btn.parentNode.insertBefore(feedback, btn.nextSibling);
      } else {
        container.querySelector('.lookbook__actions')?.appendChild(feedback);
      }

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        if (feedback.parentNode) feedback.remove();
      }, 4000);
    }

    // ---- Helper: Update cart count ----
    function updateCartCount(cart) {
      const cartCountElements = document.querySelectorAll('[data-cart-count]');
      const count = cart.item_count || 0;
      cartCountElements.forEach((el) => {
        el.textContent = count;
        // Update aria-label if present
        const label = el.getAttribute('aria-label');
        if (label) {
          el.setAttribute('aria-label', `${count} items in cart`);
        }
      });
    }
  };

  const initAll = (root) => {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('[data-lookbook]').forEach(initSection);
  };

  initAll();

  // Re-init when the merchant edits the section in the theme editor
  document.addEventListener('shopify:section:load', (event) => {
    initAll(event.target);
  });

  // Open the popover of a hotspot block selected in the theme editor
  document.addEventListener('shopify:block:select', (event) => {
    const hotspot = event.target.closest && event.target.closest('[data-lookbook-hotspot]');
    const target = hotspot || event.target.querySelector('[data-lookbook-hotspot]');
    if (target) target.setAttribute('open', '');
  });

  document.addEventListener('shopify:block:deselect', (event) => {
    const hotspot = event.target.closest && event.target.closest('[data-lookbook-hotspot]');
    const target = hotspot || event.target.querySelector('[data-lookbook-hotspot]');
    if (target) target.removeAttribute('open');
  });
})();


/* Theme Complete the Look — shared batch helper */
window.ThemeCompleteTheLook = window.ThemeCompleteTheLook || {
  async addItems(items) {
    if (!items || !items.length) return { ok: false, error: 'No items' };
    // Deduplicate by variant id, sum quantities
    const map = new Map();
    items.forEach((it) => {
      const id = String(it.id);
      const qty = Number(it.quantity) || 1;
      if (!id) return;
      map.set(id, (map.get(id) || 0) + qty);
    });
    const payload = {
      items: Array.from(map.entries()).map(([id, quantity]) => ({
        id: Number(id),
        quantity: quantity
      }))
    };
    const res = await fetch(window.Shopify?.routes?.root
      ? window.Shopify.routes.root + 'cart/add.js'
      : '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.description || err.message || 'Could not add items');
    }
    const data = await res.json();
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
    return { ok: true, data };
  }
};