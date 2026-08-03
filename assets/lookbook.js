// ========== LOOKBOOK JAVASCRIPT ==========
// Hotspot popover behavior: one open at a time, close on outside click
// and Escape, aria-expanded kept in sync. Popovers still work without
// this file thanks to native <details> behavior.
//
// New: "Shop the whole look" batch add to cart using Shopify's
// /cart/add.js endpoint with an items array.

(() => {
  const initSection = (section) => {
    if (section.dataset.lookbookInit) return;
    section.dataset.lookbookInit = 'true';

    const hotspots = section.querySelectorAll('[data-lookbook-hotspot]');
    if (!hotspots.length) return;

    // ---- Popover behavior ----
    const closeAll = (except) => {
      hotspots.forEach((hotspot) => {
        if (hotspot !== except) hotspot.removeAttribute('open');
      });
    };

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
          wholeLookBtn.textContent = 'Adding...';

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
          wholeLookBtn.textContent = 'Shop the Whole Look';
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
