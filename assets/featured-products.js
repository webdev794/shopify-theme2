/**
 * Featured Products JavaScript
 * Handles carousel navigation, quick add, video playback, and quick view.
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

    var ticking = false;
    grid.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateButtons();
        ticking = false;
      });
    }, { passive: true });

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

  /* ---------------- Video Playback ---------------- */

  function initVideo(section) {
    section.querySelectorAll('.product-card__media-container').forEach(function (container) {
      var video = container.querySelector('.product-card__video');
      var playBtn = container.querySelector('.product-card__play-btn');
      if (!video || !playBtn) return;

      var isPlaying = false;

      function play() {
        video.play().catch(function () {});
        isPlaying = true;
        playBtn.classList.add('hidden');
      }

      function pause() {
        video.pause();
        isPlaying = false;
        playBtn.classList.remove('hidden');
      }

      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      });

      container.addEventListener('mouseenter', function () {
        if (!isPlaying) play();
      });
      container.addEventListener('mouseleave', function () {
        if (isPlaying) pause();
      });

      container.addEventListener('touchstart', function (e) {
        if (e.target.closest('.product-card__play-btn')) return;
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      });

      video.addEventListener('ended', function () {
        pause();
        video.currentTime = 0;
      });
    });
  }

  /* ---------------- Quick Add (product card) ---------------- */

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
        document.querySelectorAll('.cart-count, .cart__count, .cart-item-count').forEach(function (el) {
          el.textContent = cart.item_count;
        });
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

  /* ---------------- Format Money Helper ---------------- */

  function formatMoney(amount) {
    // Assume amount is in cents (e.g., 1000 -> $10.00)
    var num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return amount;
    var dollars = (num / 100).toFixed(2);
    return '$' + dollars;
  }

  /* ---------------- Quick View (modal) ---------------- */

  function initQuickView(section) {
    var modal = document.querySelector('[data-quickview-modal]');
    var body = modal.querySelector('.featured-products__quickview-body');
    var closeBtns = modal.querySelectorAll('[data-quickview-close]');

    function openQuickView(handle) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      body.innerHTML = '<div class="product__loading">Loading…</div>';

      fetch('/products/' + handle + '.js')
        .then(function (response) { return response.json(); })
        .then(function (product) {
          var html = '<div class="product">';
          // Media column
          html += '<div class="product__media">';
          if (product.images && product.images.length > 0) {
            html += '<img src="' + product.images[0] + '" alt="' + product.title + '" loading="lazy">';
          } else {
            html += '<div class="product__media-placeholder">No image</div>';
          }
          html += '</div>';

          // Info column
          html += '<div class="product__info">';
          html += '<h2 class="product__title">' + product.title + '</h2>';

          // Price with currency
          var variant = product.variants[0];
          var formattedPrice = formatMoney(variant.price);
          html += '<p class="product__price">' + formattedPrice + '</p>';

          if (product.description) {
            html += '<div class="product__description">' + product.description + '</div>';
          }

          // Variant selector if multiple variants
          if (product.variants.length > 1) {
            html += '<select class="product__variant-select">';
            product.variants.forEach(function (v) {
              var vPrice = formatMoney(v.price);
              html += '<option value="' + v.id + '">' + v.title + ' - ' + vPrice + '</option>';
            });
            html += '</select>';
          }

          // Quantity selector with +/- buttons
          html += '<div class="product__quantity">';
          html += '<label for="quickview-qty">Quantity</label>';
          html += '<div class="product__quantity-control">';
          html += '<button class="product__quantity-btn product__quantity-btn--minus" type="button" aria-label="Decrease quantity">-</button>';
          html += '<input type="number" id="quickview-qty" class="product__quantity-input" value="1" min="1" max="99">';
          html += '<button class="product__quantity-btn product__quantity-btn--plus" type="button" aria-label="Increase quantity">+</button>';
          html += '</div></div>';

          // Add to cart button
          html += '<button class="product__add-to-cart" data-variant-id="' + variant.id + '">Add to Cart</button>';
          html += '</div></div>';

          body.innerHTML = html;

          // Wire up quantity buttons
          var qtyInput = body.querySelector('.product__quantity-input');
          var minusBtn = body.querySelector('.product__quantity-btn--minus');
          var plusBtn = body.querySelector('.product__quantity-btn--plus');

          if (qtyInput && minusBtn && plusBtn) {
            minusBtn.addEventListener('click', function () {
              var val = parseInt(qtyInput.value, 10) || 1;
              if (val > 1) qtyInput.value = val - 1;
            });
            plusBtn.addEventListener('click', function () {
              var val = parseInt(qtyInput.value, 10) || 1;
              if (val < 99) qtyInput.value = val + 1;
            });
            qtyInput.addEventListener('change', function () {
              var val = parseInt(qtyInput.value, 10);
              if (isNaN(val) || val < 1) qtyInput.value = 1;
              if (val > 99) qtyInput.value = 99;
            });
          }

          // Wire up variant selector change to update button's data-variant-id and price
          var select = body.querySelector('.product__variant-select');
          var addBtn = body.querySelector('.product__add-to-cart');

          if (select && addBtn) {
            select.addEventListener('change', function () {
              var selectedVariant = product.variants.find(function (v) { return v.id == select.value; });
              if (selectedVariant) {
                addBtn.dataset.variantId = selectedVariant.id;
                var priceDisplay = body.querySelector('.product__price');
                if (priceDisplay) {
                  priceDisplay.textContent = formatMoney(selectedVariant.price);
                }
              }
            });
          }

          // Add to cart inside quick view (with quantity and feedback)
          if (addBtn) {
            addBtn.addEventListener('click', function () {
              var variantId = addBtn.dataset.variantId;
              var quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
              if (!variantId) return;

              // Disable button and show adding state
              var originalText = addBtn.textContent;
              addBtn.textContent = 'Adding…';
              addBtn.disabled = true;

              var formData = new FormData();
              formData.append('id', variantId);
              formData.append('quantity', quantity);
              fetch('/cart/add.js', { method: 'POST', body: formData })
                .then(function (res) { return res.json(); })
                .then(function () {
                  addBtn.textContent = 'Added ✓';
                  addBtn.classList.add('product__add-to-cart--success');
                  showNotification('Added to cart', 'success');
                  refreshCart();
                  // Close after delay
                  setTimeout(function () {
                    closeQuickView();
                  }, 1500);
                })
                .catch(function () {
                  addBtn.textContent = 'Error';
                  addBtn.classList.add('product__add-to-cart--error');
                  showNotification('Error adding to cart', 'error');
                  setTimeout(function () {
                    addBtn.textContent = originalText;
                    addBtn.disabled = false;
                    addBtn.classList.remove('product__add-to-cart--error');
                  }, 2000);
                });
            });
          }
        })
        .catch(function () {
          body.innerHTML = '<p>Error loading product.</p>';
        });
    }

    function closeQuickView() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      body.innerHTML = '';
    }

    // Event delegation for quick view buttons
    section.addEventListener('click', function (e) {
      var btn = e.target.closest('.product-card__quick-view');
      if (!btn) return;
      e.preventDefault();
      var handle = btn.dataset.productHandle;
      if (handle) {
        openQuickView(handle);
      }
    });

    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', closeQuickView);
    });

    modal.querySelector('.featured-products__quickview-backdrop').addEventListener('click', closeQuickView);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeQuickView();
      }
    });
  }

  /* ---------------- Init ---------------- */

  function initSection(section) {
    if (section.dataset.fpInit) return;
    section.dataset.fpInit = 'true';
    initCarousel(section);
    initQuickAdd(section);
    initVideo(section);
    initQuickView(section);
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

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();