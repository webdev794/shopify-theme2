// ========== THE SUVARA RITUAL — Images with Text Carousel ==========

(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const initCarousel = (carousel) => {
    if (carousel.dataset.iwtInit) return;
    carousel.dataset.iwtInit = 'true';

    const scroller = carousel.querySelector('[data-iwt-scroller]');
    const slides = Array.from(carousel.querySelectorAll('[data-iwt-slide]'));
    if (!scroller || slides.length < 2) return;

    const prevButton = carousel.querySelector('[data-iwt-prev]');
    const nextButton = carousel.querySelector('[data-iwt-next]');
    const dots = Array.from(carousel.querySelectorAll('[data-iwt-dot]'));
    const playback = carousel.querySelector('[data-iwt-playback]');

    let currentIndex = 0;

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

    const goTo = (index) => {
      const target = slides[(index + slides.length) % slides.length];
      scroller.scrollTo({
        left: target.offsetLeft - scroller.offsetLeft,
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
      });
    };

    /* --- Track the visible slide (works for swipes too) --- */
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setCurrent(slides.indexOf(entry.target));
          });
        },
        { root: scroller, threshold: 0.6 }
      );
      slides.forEach((slide) => observer.observe(slide));
    }

    /* --- Arrows and dots --- */
    if (prevButton) prevButton.addEventListener('click', () => goTo(currentIndex - 1));
    if (nextButton) nextButton.addEventListener('click', () => goTo(currentIndex + 1));
    dots.forEach((dot) => {
      dot.addEventListener('click', () => goTo(Number(dot.dataset.iwtDot)));
    });

    /* --- Autoplay --- */
    if (!carousel.hasAttribute('data-autoplay') || reducedMotion.matches) return;

    const speed = (Number(carousel.dataset.autoplaySpeed) || 6) * 1000;
    let timer = null;
    let pausedByUser = false;
    let hovered = false;
    let focused = false;
    let visible = true;

    const setPlaybackState = (paused) => {
      carousel.classList.toggle('iwt-carousel--paused', paused);
      scroller.setAttribute('aria-live', paused ? 'polite' : 'off');
      if (playback) {
        const pauseLabel = playback.getAttribute('aria-label');
        if (!playback.dataset.pauseLabel) playback.dataset.pauseLabel = pauseLabel;
        playback.setAttribute(
          'aria-label',
          paused ? playback.dataset.playLabel : playback.dataset.pauseLabel
        );
      }
    };

    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    const update = () => {
      const shouldPlay = !pausedByUser && !hovered && !focused && visible;
      if (shouldPlay && !timer) {
        timer = setInterval(() => goTo(currentIndex + 1), speed);
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
    // Manual swiping pauses the rotation permanently
    scroller.addEventListener('touchstart', () => { pausedByUser = true; update(); }, { passive: true });

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
    scope.querySelectorAll('[data-iwt-carousel]').forEach(initCarousel);
  };

  initAll();

  /* --- Theme editor integration --- */
  document.addEventListener('shopify:section:load', (event) => {
    initAll(event.target);
  });

  document.addEventListener('shopify:block:select', (event) => {
    const slide = event.target.closest ? event.target.closest('[data-iwt-slide]') : null;
    const target = slide || (event.target.querySelector && event.target.querySelector('[data-iwt-slide]'));
    if (!target) return;
    const scroller = target.closest('[data-iwt-scroller]');
    if (scroller) {
      scroller.scrollTo({ left: target.offsetLeft - scroller.offsetLeft, behavior: 'auto' });
    }
  });
})();
