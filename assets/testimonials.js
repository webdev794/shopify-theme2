/* =========================================================
   PETLIO — TESTIMONIALS SLIDER
   Draggable/swipeable card track with arrow-button stepping and
   snap-to-card on release, plus a lightweight parallax on the
   section's background photo. Reused pattern: init guarded per
   element (WeakSet-free via a dataset flag, matching the lookbook
   section's convention), re-initialized on theme-editor section
   load/reorder/select.
   ========================================================= */

(function () {
  'use strict';

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initSlider(sliderEl) {
    if (sliderEl.dataset.sliderInit) return;
    sliderEl.dataset.sliderInit = 'true';

    var viewport = sliderEl.querySelector('[data-slider-viewport]');
    var track = sliderEl.querySelector('[data-slider-track]');
    var prevBtn = sliderEl.querySelector('[data-slider-prev]');
    var nextBtn = sliderEl.querySelector('[data-slider-next]');
    if (!viewport || !track) return;

    var items = Array.prototype.slice.call(
      track.querySelectorAll('[data-slider-item]')
    );
    if (!items.length) return;

    var currentX = 0;

    function itemStep() {
      if (items.length < 2) {
        return items[0].getBoundingClientRect().width;
      }
      var r0 = items[0].getBoundingClientRect();
      var r1 = items[1].getBoundingClientRect();
      return r1.left - r0.left;
    }

    function maxScroll() {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }

    function clamp(x) {
      var max = maxScroll();
      return Math.min(0, Math.max(-max, x));
    }

    function updateButtons() {
      var max = maxScroll();
      if (prevBtn) prevBtn.disabled = currentX >= -1;
      if (nextBtn) nextBtn.disabled = currentX <= -max + 1;
    }

    function setX(x, animate) {
      currentX = clamp(x);
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translate3d(' + currentX.toFixed(1) + 'px,0,0)';
      updateButtons();
    }

    function step(dir) {
      setX(currentX - dir * itemStep(), true);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        step(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        step(1);
      });
    }

    /* Drag / swipe (pointer events cover mouse + touch + pen) */
    var dragging = false;
    var dragStartX = 0;
    var dragStartTranslate = 0;
    var activePointerId = null;

    function onPointerDown(e) {
      dragging = true;
      activePointerId = e.pointerId;
      dragStartX = e.clientX;
      dragStartTranslate = currentX;
      track.classList.add('is-dragging');
      track.style.transition = 'none';
      if (track.setPointerCapture && activePointerId != null) {
        try {
          track.setPointerCapture(activePointerId);
        } catch (err) {}
      }
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var dx = e.clientX - dragStartX;
      setX(dragStartTranslate + dx, false);
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      var s = itemStep();
      var nearest = s > 0 ? Math.round(currentX / s) * s : currentX;
      setX(nearest, true);
    }

    track.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    /* Dragging shouldn't also trigger native image/link drag-out */
    track.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });

    /* Arrow-key stepping when the slider has focus */
    sliderEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        step(-1);
      } else if (e.key === 'ArrowRight') {
        step(1);
      }
    });

    window.addEventListener(
      'resize',
      function () {
        setX(currentX, false);
      },
      { passive: true }
    );

    setX(0, false);
  }

  function initParallax(sectionEl) {
    if (reduceMotion) return;
    var img = sectionEl.querySelector('[data-testimonials-parallax]');
    if (!img || img.dataset.parallaxInit) return;
    img.dataset.parallaxInit = 'true';

    var ticking = false;

    function update() {
      var rect = sectionEl.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var progress = (vh - rect.top) / (vh + rect.height);
      progress = Math.max(0, Math.min(1, progress));
      var shift = (progress - 0.5) * 60; // px of vertical travel
      img.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  function initAll(root) {
    root = root || document;
    root.querySelectorAll('[data-section-type="testimonials"]').forEach(function (section) {
      var slider = section.querySelector('[data-testimonials-slider]');
      if (slider) initSlider(slider);
      initParallax(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
  document.addEventListener('shopify:section:reorder', function () {
    initAll(document);
  });
  document.addEventListener('shopify:section:select', function (event) {
    initAll(event.target);
  });
})();