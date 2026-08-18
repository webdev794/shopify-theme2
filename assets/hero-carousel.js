// ========== HERO CAROUSEL JAVASCRIPT ==========
// Uses the same horizontal scaleX expand/collapse transition
// as the Slideshow with Marquee section for a distinctive feel.

(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DURATION = 950; // ms – matches CSS transition

  const initCarousel = (carousel) => {
    if (carousel.dataset.hcInit) return;
    carousel.dataset.hcInit = 'true';

    const scroller = carousel.querySelector('[data-hc-scroller]');
    const slides = Array.from(carousel.querySelectorAll('[data-hc-slide]'));
    if (!scroller || slides.length === 0) return;

    const prevButton = carousel.querySelector('[data-hc-prev]');
    const nextButton = carousel.querySelector('[data-hc-next]');
    const dots = Array.from(carousel.querySelectorAll('[data-hc-dot]'));
    const playback = carousel.querySelector('[data-hc-playback]');

    let currentIndex = 0;
    let isAnimating = false;

    // Initial state – first slide active, others collapsed
    slides.forEach((slide, i) => {
      slide.setAttribute('data-origin', 'left');
      if (i === 0) {
        slide.setAttribute('data-active', 'true');
        slide.setAttribute('aria-hidden', 'false');
      } else {
        slide.setAttribute('data-active', 'false');
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    const setCurrent = (index) => {
      currentIndex = index;
      dots.forEach((dot, i) => {
        if (i === index) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
    };

    const goTo = (index, direction) => {
      if (isAnimating || slides.length < 2) return;

      // Normalize index
      const to = ((index % slides.length) + slides.length) % slides.length;
      if (to === currentIndex) return;

      const from = currentIndex;

      // Determine direction if not provided
      if (direction === undefined) {
        direction = to > from || (from === slides.length - 1 && to === 0) ? 1 : -1;
        if (from === 0 && to === slides.length - 1) direction = -1;
        if (from === slides.length - 1 && to === 0) direction = 1;
      }

      const leaving = slides[from];
      const entering = slides[to];

      if (reducedMotion.matches) {
        // Instant swap for reduced motion
        leaving.setAttribute('data-active', 'false');
        leaving.setAttribute('aria-hidden', 'true');
        leaving.removeAttribute('data-leaving');
        entering.setAttribute('data-active', 'true');
        entering.setAttribute('aria-hidden', 'false');
        entering.removeAttribute('data-leaving');
        setCurrent(to);
        return;
      }

      isAnimating = true;

      // Direction-aware origins:
      // next → leaving collapses left, entering expands from right
      // prev → leaving collapses right, entering expands from left
      if (direction >= 0) {
        leaving.setAttribute('data-origin', 'left');
        entering.setAttribute('data-origin', 'right');
      } else {
        leaving.setAttribute('data-origin', 'right');
        entering.setAttribute('data-origin', 'left');
      }

      leaving.setAttribute('data-leaving', 'true');
      leaving.setAttribute('data-active', 'false');
      leaving.setAttribute('aria-hidden', 'true');

      // Force reflow so origin is applied before scale
      void entering.offsetWidth;

      entering.setAttribute('data-active', 'true');
      entering.setAttribute('aria-hidden', 'false');
      entering.removeAttribute('data-leaving');

      setCurrent(to);

      setTimeout(() => {
        leaving.removeAttribute('data-leaving');
        isAnimating = false;
      }, DURATION);
    };

    /* --- Arrows and dots --- */
    if (prevButton) {
      prevButton.addEventListener('click', (e) => {
        e.preventDefault();
        goTo(currentIndex - 1, -1);
        // Restart autoplay after manual interaction
        if (carousel.hasAttribute('data-autoplay') && !reducedMotion.matches) {
          pausedByUser = false;
          update();
        }
      });
    }
    if (nextButton) {
      nextButton.addEventListener('click', (e) => {
        e.preventDefault();
        goTo(currentIndex + 1, 1);
        if (carousel.hasAttribute('data-autoplay') && !reducedMotion.matches) {
          pausedByUser = false;
          update();
        }
      });
    }
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const idx = Number(dot.dataset.hcDot);
        if (idx !== currentIndex) {
          goTo(idx);
          if (carousel.hasAttribute('data-autoplay') && !reducedMotion.matches) {
            pausedByUser = false;
            update();
          }
        }
      });
    });

    /* --- Keyboard --- */
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(currentIndex - 1, -1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(currentIndex + 1, 1);
      }
    });

    /* --- Autoplay --- */
    if (!carousel.hasAttribute('data-autoplay') || reducedMotion.matches) {
      // Still expose a no-op update for consistency
      return;
    }

    const speed = (Number(carousel.dataset.autoplaySpeed) || 6) * 1000;
    let timer = null;
    let pausedByUser = false;
    let hovered = false;
    let focused = false;
    let visible = true;

    const setPlaybackState = (paused) => {
      carousel.classList.toggle('hero-carousel--paused', paused);
      scroller.setAttribute('aria-live', paused ? 'polite' : 'off');
      if (playback) {
        if (!playback.dataset.pauseLabel) {
          playback.dataset.pauseLabel = playback.getAttribute('aria-label') || 'Pause';
        }
        playback.setAttribute(
          'aria-label',
          paused ? (playback.dataset.playLabel || 'Play') : playback.dataset.pauseLabel
        );
      }
    };

    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    const update = () => {
      const shouldPlay = !pausedByUser && !hovered && !focused && visible && !isAnimating;
      if (shouldPlay && !timer) {
        timer = setInterval(() => goTo(currentIndex + 1, 1), speed);
      } else if (!shouldPlay) {
        stop();
      }
      setPlaybackState(!shouldPlay);
    };

    if (playback) {
      playback.addEventListener('click', () => {
        pausedByUser = !pausedByUser;
        update();
      });
    }

    carousel.addEventListener('pointerenter', () => { hovered = true; update(); });
    carousel.addEventListener('pointerleave', () => { hovered = false; update(); });
    carousel.addEventListener('focusin', () => { focused = true; update(); });
    carousel.addEventListener('focusout', (event) => {
      if (!carousel.contains(event.relatedTarget)) {
        focused = false;
        update();
      }
    });

    if ('IntersectionObserver' in window) {
      const visibility = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            visible = entry.isIntersecting;
            update();
          });
        },
        { threshold: 0.3 }
      );
      visibility.observe(carousel);
    }

    update();
  };

  const initAll = (root) => {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('[data-hero-carousel]').forEach(initCarousel);
  };

  initAll();

  /* --- Theme editor integration --- */
  document.addEventListener('shopify:section:load', (event) => {
    // Reset init flag so the section re-initializes cleanly
    const carousel = event.target.querySelector
      ? event.target.querySelector('[data-hero-carousel]')
      : null;
    if (carousel) delete carousel.dataset.hcInit;
    initAll(event.target);
  });

  document.addEventListener('shopify:block:select', (event) => {
    const slide = event.target.closest
      ? event.target.closest('[data-hc-slide]')
      : null;
    if (!slide) return;
    const carousel = slide.closest('[data-hero-carousel]');
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll('[data-hc-slide]'));
    const index = slides.indexOf(slide);
    if (index === -1) return;

    // Instantly show the selected slide in the editor
    slides.forEach((s, i) => {
      if (i === index) {
        s.setAttribute('data-active', 'true');
        s.setAttribute('aria-hidden', 'false');
        s.removeAttribute('data-leaving');
      } else {
        s.setAttribute('data-active', 'false');
        s.setAttribute('aria-hidden', 'true');
        s.removeAttribute('data-leaving');
      }
    });
  });
})();
