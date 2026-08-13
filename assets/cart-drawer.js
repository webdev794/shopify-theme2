/* Cart drawer disabled — use cart page instead. */
(function () {
  'use strict';
  // Prevent any leftover data-cart-drawer-open handlers from blocking navigation
  document.addEventListener('click', function (e) {
    var openTrigger = e.target.closest('[data-cart-drawer-open]');
    if (!openTrigger) return;
    // Allow normal link navigation to /cart
    if (openTrigger.tagName === 'A' && openTrigger.getAttribute('href')) {
      return;
    }
    e.preventDefault();
    window.location.href = (window.Shopify && window.Shopify.routes && window.Shopify.routes.cart) || '/cart';
  }, true);
})();
