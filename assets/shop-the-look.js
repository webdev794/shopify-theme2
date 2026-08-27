/* ============================================================
   Shop The Look Premium — assets/shop-the-look.js
   Faithful split of the original inline <script>. Behavior is
   unchanged: IntersectionObserver reveal animation + prev/next
   arrow and dot-controlled slider. Generalized to initialize
   every .shop-the-look section on the page instead of a single
   hardcoded #ShopLook-{{ section_id }} element.
============================================================ */

(function () {
  'use strict';

  var RESET_DELAY = 1800;

  function setButtonLabel(button, state) {
    var label = button.querySelector('.sl-button-label');
    var text = button.getAttribute('data-text-' + state);

    if (text && label) {
      label.textContent = text;
    }
  }

  function refreshCartCount() {
    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        document.querySelectorAll('[data-cart-count]').forEach(function (el) {
          el.textContent = cart.item_count;
        });
        document.dispatchEvent(
          new CustomEvent('cart:updated', { detail: cart, bubbles: true })
        );
      })
      .catch(function () {
        /* non-fatal: cart count badge just won't refresh */
      });
  }

  function addLookToCart(section, button) {
    var variantId = button.getAttribute('data-variant-id');
    if (!variantId || button.disabled) return;

    var cartAddUrl = section.dataset.cartAddUrl || '/cart/add.js';

    button.disabled = true;
    button.classList.remove('is-added', 'is-error');
    button.classList.add('is-adding');
    setButtonLabel(button, 'adding');

    fetch(cartAddUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ items: [{ id: parseInt(variantId, 10), quantity: 1 }] })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          throw new Error((result.data && result.data.description) || 'Cart add failed');
        }

        button.classList.remove('is-adding');
        button.classList.add('is-added');
        setButtonLabel(button, 'added');

        refreshCartCount();
      })
      .catch(function () {
        button.classList.remove('is-adding');
        button.classList.add('is-error');
        setButtonLabel(button, 'error');
      })
      .finally(function () {
        setTimeout(function () {
          button.classList.remove('is-adding', 'is-added', 'is-error');
          button.disabled = false;
          setButtonLabel(button, 'idle');
        }, RESET_DELAY);
      });
  }

  function initShopTheLook(section) {
    if (!section || section.dataset.initialized) return;

    section.dataset.initialized = 'true';


    /* SECTION ANIMATION */

    if ('IntersectionObserver' in window) {

      var observer = new IntersectionObserver(
        function (entries) {

          entries.forEach(function (entry) {

            if (entry.isIntersecting) {

              section.classList.add('is-visible');

              observer.unobserve(section);

            }

          });

        },
        {
          threshold: 0.15
        }
      );

      observer.observe(section);

    } else {

      section.classList.add('is-visible');

    }


    /* SLIDER */

    var slides = section.querySelectorAll('.sl-slide');
    var dots = section.querySelectorAll('.sl-dot');

    var current = 0;
    var total = slides.length;


    function showSlide(index) {

      if (!total) return;

      if (index < 0) {
        index = total - 1;
      }

      if (index >= total) {
        index = 0;
      }


      slides.forEach(function (slide, i) {

        slide.classList.toggle(
          'is-active',
          i === index
        );

      });


      dots.forEach(function (dot, i) {

        dot.classList.toggle(
          'is-active',
          i === index
        );

      });


      current = index;

    }


    section.addEventListener('click', function (event) {

      var prev = event.target.closest('.sl-prev');
      var next = event.target.closest('.sl-next');
      var dot = event.target.closest('.sl-dot');
      var addLook = event.target.closest('.sl-add-look');


      if (prev) {

        showSlide(current - 1);

      }


      if (next) {

        showSlide(current + 1);

      }


      if (dot) {

        var index = parseInt(
          dot.getAttribute('data-index'),
          10
        );

        showSlide(index);

      }


      if (addLook && !addLook.disabled) {

        addLookToCart(section, addLook);

      }

    });

  }

  function initAll(root) {
    var scope = root || document;
    scope.querySelectorAll('.shop-the-look').forEach(initShopTheLook);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAll(document);
  });

  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector('.shop-the-look');
    if (section) initShopTheLook(section);
  });

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initAll(document);
  }

})();