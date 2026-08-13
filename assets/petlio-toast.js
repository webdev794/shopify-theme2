
(function (global) {
  'use strict';

  var toastEl = null;
  var hideTimer = null;

  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'petlio-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.innerHTML =
      '<span class="petlio-toast__icon" aria-hidden="true">✓</span>' +
      '<span class="petlio-toast__message"></span>';
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function showToast(message, options) {
    options = options || {};
    var el = ensureToast();
    var msg = el.querySelector('.petlio-toast__message');
    var cartUrl = (window.Shopify && window.Shopify.routes && window.Shopify.routes.cart) || '/cart';

    if (options.withCartLink) {
      msg.innerHTML =
        (message || 'Added to cart') +
        ' <a class="petlio-toast__link" href="' + cartUrl + '">View cart</a>';
    } else {
      msg.textContent = message || 'Added to cart';
    }

    el.classList.add('is-visible');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, options.duration || 2800);
  }

  global.PetlioToast = { show: showToast };

  // Load CSS if not already present
  if (!document.querySelector('link[href*="petlio-toast.css"]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = (window.theme && window.theme.toastCss) || '';
    // CSS is loaded from layout; this is fallback only
  }
})(typeof window !== 'undefined' ? window : this);
