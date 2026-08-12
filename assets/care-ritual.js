/* =========================================================
   PETLIO — CARE RITUAL
   Chapter 07
   ========================================================= */

(function () {
  'use strict';

  var initializedSections = new WeakSet();

  function initCareRitual(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add('is-visible');

            observer.unobserve(entry.target);
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

    var visual = section.querySelector(
      '.petlio-care__visual'
    );

    var image = section.querySelector(
      '.petlio-care__image'
    );

    if (
      !visual ||
      !image ||
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
    ) {
      return;
    }

    var ticking = false;

    function updateParallax() {
      if (window.innerWidth <= 749) {
        image.style.transform = 'scale(1.001)';
        ticking = false;
        return;
      }

      var rect = visual.getBoundingClientRect();
      var viewportHeight = window.innerHeight;

      if (
        rect.bottom < 0 ||
        rect.top > viewportHeight
      ) {
        ticking = false;
        return;
      }

      var progress =
        (viewportHeight - rect.top) /
        (viewportHeight + rect.height);

      var offset =
        (progress - 0.5) * -12;

      image.style.transform =
        'scale(1.025) translateY(' +
        offset.toFixed(2) +
        'px)';

      ticking = false;
    }

    function requestParallax() {
      if (ticking) {
        return;
      }

      ticking = true;

      window.requestAnimationFrame(
        updateParallax
      );
    }

    window.addEventListener(
      'scroll',
      requestParallax,
      { passive: true }
    );

    window.addEventListener(
      'resize',
      requestParallax,
      { passive: true }
    );

    requestParallax();
  }

  function initAll(root) {
    root = root || document;

    var sections = root.querySelectorAll(
      '[data-section-type="care-ritual"]'
    );

    sections.forEach(function (section) {
      initCareRitual(section);
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