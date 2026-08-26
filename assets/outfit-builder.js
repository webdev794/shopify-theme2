/* =========================================================
   PETLIO — OUTFIT BUILDER
   Handles:
   - Product selection
   - Maximum item limit
   - Variant selection
   - Selection summary
   - Total price
   - Remove from outfit
   - Add complete outfit to cart
   - Progress bar feedback
   - Shopify theme editor re-initialization
   ========================================================= */

(function () {
  'use strict';

  var initializedSections = new WeakSet();

  function initOutfitBuilder(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);

    var maxItems = parseInt(section.dataset.maxItems || '4', 10);

    if (!Number.isFinite(maxItems) || maxItems < 1) {
      maxItems = 4;
    }

    var catalog = section.querySelector('[data-ob-catalog]');
    var summary = section.querySelector('[data-ob-summary]');
    var selectionList = section.querySelector('[data-ob-selection]');
    var emptyEl = section.querySelector('[data-ob-empty]');
    var totalsEl = section.querySelector('[data-ob-totals]');
    var totalPriceEl = section.querySelector('[data-ob-total-price]');
    var addAllBtn = section.querySelector('[data-ob-add-all]');
    var countEl = section.querySelector('[data-ob-count]');

    // Progress bar elements
    var progressWrap = section.querySelector('[data-ob-progress-wrap]');
    var progressBar = section.querySelector('[data-ob-progress-bar]');
    var progressCount = section.querySelector('[data-ob-progress-count]');

    if (!catalog || !summary) {
      return;
    }

    var productCards = Array.from(
      catalog.querySelectorAll('[data-ob-product]')
    );

    var selection = [];

    /*
     * ---------------------------------------------------------
     * MONEY
     * ---------------------------------------------------------
     */

    function formatMoney(cents) {
      cents = Number(cents) || 0;

      /*
       * Shopify's money format can vary by store.
       * This keeps the builder independent of theme-specific
       * Liquid formatting while still presenting a clean price.
       */
      try {
        if (
          window.Shopify &&
          typeof window.Shopify.formatMoney === 'function'
        ) {
          return window.Shopify.formatMoney(
            cents,
            window.Shopify.money_format || '${{amount}}'
          );
        }
      } catch (error) {
        // Fall through to basic formatting.
      }

      return '$' + (cents / 100).toFixed(2);
    }

    /*
     * ---------------------------------------------------------
     * PRODUCT / VARIANT DATA
     * ---------------------------------------------------------
     */

    function getVariantData(card) {
      var variantSelect = card.querySelector('[data-ob-variant]');

      if (variantSelect) {
        var selectedOption =
          variantSelect.options[variantSelect.selectedIndex];

        if (selectedOption) {
          return {
            variantId: selectedOption.value,
            price: parseInt(
              selectedOption.dataset.price || card.dataset.price || '0',
              10
            ),
            available:
              selectedOption.dataset.available !== 'false'
          };
        }
      }

      return {
        variantId: card.dataset.variantId,
        price: parseInt(card.dataset.price || '0', 10),
        available: true
      };
    }

    function getProductData(card) {
      var variantData = getVariantData(card);

      return {
        productId: card.dataset.productId,
        variantId: variantData.variantId,
        title: card.dataset.title || 'Product',
        price: Number(variantData.price) || 0,
        available: variantData.available,
        card: card
      };
    }

    /*
     * ---------------------------------------------------------
     * SELECTION HELPERS
     * ---------------------------------------------------------
     */

    function findSelectionIndex(productId) {
      return selection.findIndex(function (item) {
        return item.productId === productId;
      });
    }

    function isSelected(productId) {
      return findSelectionIndex(productId) !== -1;
    }

    function updateCardState(card) {
      var productId = card.dataset.productId;
      var selected = isSelected(productId);

      card.classList.toggle('is-selected', selected);

      var button = card.querySelector('[data-ob-select]');
      var buttonText = card.querySelector('.outfit-builder__select-text');

      if (button) {
        if (selected) {
          button.setAttribute('aria-pressed', 'true');
        } else {
          button.setAttribute('aria-pressed', 'false');
        }
      }

      if (buttonText) {
        buttonText.textContent = selected
          ? 'Added to outfit'
          : 'Add to outfit';
      }
    }

    /*
     * ---------------------------------------------------------
     * RENDER SUMMARY
     * ---------------------------------------------------------
     */

    function renderSelection() {
      if (!selectionList) {
        return;
      }

      selectionList.innerHTML = '';

      selection.forEach(function (item) {
        var li = document.createElement('li');

        li.className = 'outfit-builder__selection-item';

        li.innerHTML =
          '<span>' +
          escapeHtml(item.title) +
          '<small>' +
          formatMoney(item.price) +
          '</small>' +
          '</span>' +
          '<button type="button" class="outfit-builder__selection-remove" data-ob-remove="' +
          escapeHtml(item.productId) +
          '">Remove</button>';

        selectionList.appendChild(li);
      });
    }

    function renderTotal() {
      var total = selection.reduce(function (sum, item) {
        return sum + item.price;
      }, 0);

      if (totalPriceEl) {
        totalPriceEl.textContent = formatMoney(total);
      }

      if (countEl) {
        countEl.textContent = selection.length + '/' + maxItems;
      }

      // Update progress bar
      if (progressBar) {
        var percent = (selection.length / maxItems) * 100;
        progressBar.style.width = Math.min(percent, 100) + '%';
      }

      if (progressCount) {
        progressCount.textContent = selection.length + ' / ' + maxItems;
      }

      // Pulse animation when item added
      if (progressWrap) {
        progressWrap.classList.remove('is-pulsing');
        // Force reflow to restart animation
        void progressWrap.offsetWidth;
        progressWrap.classList.add('is-pulsing');
      }

      var hasSelection = selection.length > 0;

      if (emptyEl) {
        emptyEl.hidden = hasSelection;
      }

      if (totalsEl) {
        totalsEl.hidden = !hasSelection;
      }

      if (addAllBtn) {
        addAllBtn.disabled = !hasSelection;
      }
    }

    function syncCards() {
      productCards.forEach(function (card) {
        updateCardState(card);
      });
    }

    function sync() {
      renderSelection();
      renderTotal();
      syncCards();
    }

    /*
     * ---------------------------------------------------------
     * ADD PRODUCT
     * ---------------------------------------------------------
     */

    function addProduct(card) {
      var product = getProductData(card);

      if (!product.variantId) {
        return;
      }

      if (!product.available) {
        return;
      }

      var existingIndex = findSelectionIndex(product.productId);

      /*
       * Clicking an already-selected product removes it.
       */
      if (existingIndex !== -1) {
        removeProduct(product.productId);
        return;
      }

      /*
       * Respect the maximum item limit.
       */
      if (selection.length >= maxItems) {
        showLimitMessage();
        return;
      }

      selection.push(product);

      sync();
    }

    /*
     * ---------------------------------------------------------
     * REMOVE PRODUCT
     * ---------------------------------------------------------
     */

    function removeProduct(productId) {
      selection = selection.filter(function (item) {
        return item.productId !== productId;
      });

      sync();
    }

    /*
     * ---------------------------------------------------------
     * MAX ITEM MESSAGE
     * ---------------------------------------------------------
     */

    function showLimitMessage() {
      var message = section.querySelector(
        '[data-ob-limit-message]'
      );

      if (!message) {
        message = document.createElement('div');

        message.className =
          'outfit-builder__limit-message';

        message.dataset.obLimitMessage = '';

        message.textContent =
          'You can choose up to ' +
          maxItems +
          ' items.';

        summary.appendChild(message);
      }

      message.classList.add('is-visible');

      window.clearTimeout(
        message._hideTimeout
      );

      message._hideTimeout = window.setTimeout(
        function () {
          message.classList.remove('is-visible');
        },
        2200
      );
    }

    /*
     * ---------------------------------------------------------
     * VARIANT CHANGE
     * ---------------------------------------------------------
     */

    function handleVariantChange(select) {
      var card = select.closest('[data-ob-product]');

      if (!card) {
        return;
      }

      var productId = card.dataset.productId;

      var index = findSelectionIndex(productId);

      /*
       * If product is already in the outfit,
       * update its selected variant and price.
       */
      if (index !== -1) {
        var variantData = getVariantData(card);

        if (!variantData.available) {
          removeProduct(productId);
          return;
        }

        selection[index].variantId =
          variantData.variantId;

        selection[index].price =
          variantData.price;

        sync();
      }
    }

    /*
     * ---------------------------------------------------------
     * ADD ALL TO CART
     * ---------------------------------------------------------
     */

    function addOutfitToCart() {
      if (!selection.length) {
        return;
      }

      if (addAllBtn) {
        addAllBtn.disabled = true;
        addAllBtn.classList.add('is-loading');
      }

      var items = selection.map(function (item) {
        return {
          id: Number(item.variantId),
          quantity: 1
        };
      });

      fetch(
        (window.Shopify &&
          window.Shopify.routes &&
          window.Shopify.routes.root
          ? window.Shopify.routes.root
          : '/') + 'cart/add.js',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            items: items
          })
        }
      )
        .then(function (response) {
          if (!response.ok) {
            throw new Error(
              'Unable to add outfit to cart.'
            );
          }

          return response.json();
        })
        .then(function () {
          /*
           * Let Shopify's cart drawer / cart UI
           * refresh itself if the theme provides it.
           */
          refreshCartUI();

          /*
           * If no cart drawer exists, go to cart.
           */
          window.setTimeout(function () {
            if (!document.querySelector(
              'cart-drawer'
            )) {
              window.location.href = '/cart';
            }
          }, 350);
        })
        .catch(function (error) {
          console.error(
            'Outfit Builder:',
            error
          );

          if (addAllBtn) {
            addAllBtn.disabled = false;
            addAllBtn.classList.remove(
              'is-loading'
            );
          }

          showCartError();
        });
    }

    /*
     * ---------------------------------------------------------
     * CART UI
     * ---------------------------------------------------------
     */

    function refreshCartUI() {
      var cartDrawer =
        document.querySelector('cart-drawer');

      if (
        cartDrawer &&
        typeof cartDrawer.open === 'function'
      ) {
        /*
         * Many Shopify themes update their cart drawer
         * through a custom refresh method.
         */
        if (
          typeof cartDrawer.renderContents ===
          'function'
        ) {
          fetch('/cart.js')
            .then(function (response) {
              return response.json();
            })
            .then(function (cart) {
              if (
                typeof cartDrawer.renderContents ===
                'function'
              ) {
                cartDrawer.open();
              }
            })
            .catch(function () {
              cartDrawer.open();
            });
        } else {
          cartDrawer.open();
        }

        return;
      }

      /*
       * Dawn-style cart notification support,
       * if present in another theme component.
       */
      var cartNotification =
        document.querySelector(
          'cart-notification'
        );

      if (
        cartNotification &&
        typeof cartNotification.open ===
          'function'
      ) {
        cartNotification.open();
      }
    }

    function showCartError() {
      var message = section.querySelector(
        '[data-ob-cart-error]'
      );

      if (!message) {
        message = document.createElement('p');

        message.dataset.obCartError = '';

        message.className =
          'outfit-builder__cart-error';

        message.textContent =
          'Something went wrong. Please try again.';

        if (addAllBtn) {
          addAllBtn.parentNode.insertBefore(
            message,
            addAllBtn
          );
        }
      }

      message.hidden = false;

      window.clearTimeout(
        message._hideTimeout
      );

      message._hideTimeout =
        window.setTimeout(function () {
          message.hidden = true;
        }, 4000);
    }

    /*
     * ---------------------------------------------------------
     * EVENTS
     * ---------------------------------------------------------
     */

    productCards.forEach(function (card) {
      var selectButton =
        card.querySelector('[data-ob-select]');

      var variantSelect =
        card.querySelector('[data-ob-variant]');

      if (selectButton) {
        selectButton.addEventListener(
          'click',
          function () {
            addProduct(card);
          }
        );
      }

      if (variantSelect) {
        variantSelect.addEventListener(
          'change',
          function () {
            handleVariantChange(
              variantSelect
            );
          }
        );
      }
    });

    /*
     * Event delegation for dynamically rendered
     * summary remove buttons.
     */
    if (selectionList) {
      selectionList.addEventListener(
        'click',
        function (event) {
          var removeButton =
            event.target.closest(
              '[data-ob-remove]'
            );

          if (!removeButton) {
            return;
          }

          removeProduct(
            removeButton.dataset.obRemove
          );
        }
      );
    }

    if (addAllBtn) {
      addAllBtn.addEventListener(
        'click',
        addOutfitToCart
      );
    }

    /*
     * ---------------------------------------------------------
     * ESCAPE HTML
     * ---------------------------------------------------------
     */

    function escapeHtml(value) {
      var div = document.createElement('div');

      div.textContent = value == null
        ? ''
        : String(value);

      return div.innerHTML;
    }

    /*
     * ---------------------------------------------------------
     * INITIAL RENDER
     * ---------------------------------------------------------
     */

    sync();
  }

  /*
   * ---------------------------------------------------------
   * INITIAL PAGE LOAD
   * ---------------------------------------------------------
   */

  function initAll(root) {
    root = root || document;

    var sections = root.querySelectorAll(
      '[data-section-type="outfit-builder"]'
    );

    sections.forEach(function (section) {
      initOutfitBuilder(section);
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