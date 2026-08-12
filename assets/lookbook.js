/* =========================================================
   PETLIO — SHOPPABLE LOOKBOOK
   Chapter 06 interactions
   ========================================================= */

(function () {
  'use strict';

  var initializedSections = new WeakSet();

  function initLookbook(section) {
    if (!section || initializedSections.has(section)) {
      return;
    }

    initializedSections.add(section);

    var hotspots = Array.from(
      section.querySelectorAll('[data-hotspot]')
    );

    if (!hotspots.length) {
      return;
    }

    /*
     * -------------------------------------------------------
     * CLOSE ALL
     * -------------------------------------------------------
     */

    function closeAll(except) {
      hotspots.forEach(function (hotspot) {
        if (hotspot === except) {
          return;
        }

        var button = hotspot.querySelector(
          '[data-hotspot-button]'
        );

        var card = hotspot.querySelector(
          '[data-product-card]'
        );

        if (button) {
          button.setAttribute(
            'aria-expanded',
            'false'
          );
        }

        if (card) {
          card.hidden = true;
        }

        hotspot.classList.remove('is-active');
      });
    }

    /*
     * -------------------------------------------------------
     * TOGGLE HOTSPOT
     * -------------------------------------------------------
     */

    function toggleHotspot(hotspot) {
      var button = hotspot.querySelector(
        '[data-hotspot-button]'
      );

      var card = hotspot.querySelector(
        '[data-product-card]'
      );

      if (!button || !card) {
        return;
      }

      var isOpen =
        button.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        button.setAttribute(
          'aria-expanded',
          'false'
        );

        card.hidden = true;

        hotspot.classList.remove(
          'is-active'
        );

        return;
      }

      closeAll(hotspot);

      button.setAttribute(
        'aria-expanded',
        'true'
      );

      card.hidden = false;

      hotspot.classList.add(
        'is-active'
      );
    }

    /*
     * -------------------------------------------------------
     * EVENTS
     * -------------------------------------------------------
     */

    hotspots.forEach(function (hotspot) {
      var button = hotspot.querySelector(
        '[data-hotspot-button]'
      );

      var closeButton = hotspot.querySelector(
        '[data-product-close]'
      );

      if (button) {
        button.addEventListener(
          'click',
          function (event) {
            event.preventDefault();

            toggleHotspot(hotspot);
          }
        );
      }

      if (closeButton) {
        closeButton.addEventListener(
          'click',
          function (event) {
            event.preventDefault();

            var hotspotButton =
              hotspot.querySelector(
                '[data-hotspot-button]'
              );

            var card =
              hotspot.querySelector(
                '[data-product-card]'
              );

            if (hotspotButton) {
              hotspotButton.setAttribute(
                'aria-expanded',
                'false'
              );
            }

            if (card) {
              card.hidden = true;
            }

            hotspot.classList.remove(
              'is-active'
            );
          }
        );
      }
    });

    /*
     * -------------------------------------------------------
     * CLICK OUTSIDE
     * -------------------------------------------------------
     */

    document.addEventListener(
      'click',
      function (event) {
        if (
          !section.contains(event.target)
        ) {
          return;
        }

        if (
          event.target.closest(
            '[data-hotspot]'
          )
        ) {
          return;
        }

        closeAll();
      }
    );

    /*
     * -------------------------------------------------------
     * ESCAPE KEY
     * -------------------------------------------------------
     */

    section.addEventListener(
      'keydown',
      function (event) {
        if (event.key !== 'Escape') {
          return;
        }

        closeAll();
      }
    );

    /*
     * -------------------------------------------------------
     * KEYBOARD NAVIGATION
     * -------------------------------------------------------
     */

    hotspots.forEach(function (hotspot, index) {
      var button = hotspot.querySelector(
        '[data-hotspot-button]'
      );

      if (!button) {
        return;
      }

      button.addEventListener(
        'keydown',
        function (event) {
          if (
            event.key !== 'ArrowRight' &&
            event.key !== 'ArrowDown' &&
            event.key !== 'ArrowLeft' &&
            event.key !== 'ArrowUp'
          ) {
            return;
          }

          event.preventDefault();

          var nextIndex;

          if (
            event.key === 'ArrowRight' ||
            event.key === 'ArrowDown'
          ) {
            nextIndex = index + 1;

            if (
              nextIndex >= hotspots.length
            ) {
              nextIndex = 0;
            }
          } else {
            nextIndex = index - 1;

            if (nextIndex < 0) {
              nextIndex =
                hotspots.length - 1;
            }
          }

          var nextButton =
            hotspots[nextIndex].querySelector(
              '[data-hotspot-button]'
            );

          if (nextButton) {
            nextButton.focus();
          }
        }
      );
    });

    /*
     * -------------------------------------------------------
     * MOBILE CARD POSITIONING
     * -------------------------------------------------------
     *
     * Prevents product cards from extending beyond
     * the scene on smaller screens.
     */

    function positionCards() {
      var isMobile =
        window.matchMedia(
          '(max-width: 749px)'
        ).matches;

      hotspots.forEach(function (hotspot) {
        var card = hotspot.querySelector(
          '[data-product-card]'
        );

        if (!card) {
          return;
        }

        card.style.removeProperty(
          'left'
        );

        card.style.removeProperty(
          'right'
        );

        if (!isMobile) {
          return;
        }

        var hotspotRect =
          hotspot.getBoundingClientRect();

        var sectionRect =
          section.getBoundingClientRect();

        var cardWidth =
          card.offsetWidth || 280;

        var leftEdge =
          hotspotRect.left -
          sectionRect.left;

        var rightEdge =
          sectionRect.right -
          hotspotRect.right;

        /*
         * If the hotspot is on the right side,
         * open the card toward the left.
         */

        if (
          rightEdge < cardWidth + 30
        ) {
          card.style.left = 'auto';
          card.style.right = '29px';
        } else {
          card.style.left = '29px';
          card.style.right = 'auto';
        }
      });
    }

    window.addEventListener(
      'resize',
      positionCards,
      { passive: true }
    );

    positionCards();
  }

  /*
   * -------------------------------------------------------
   * INITIALIZE ALL
   * -------------------------------------------------------
   */

  function initAll(root) {
    root = root || document;

    var sections = root.querySelectorAll(
      '[data-section-type="lookbook"]'
    );

    sections.forEach(function (section) {
      initLookbook(section);
    });
  }

  /*
   * -------------------------------------------------------
   * PAGE LOAD
   * -------------------------------------------------------
   */

  if (
    document.readyState === 'loading'
  ) {
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
   * -------------------------------------------------------
   * SHOPIFY THEME EDITOR
   * -------------------------------------------------------
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