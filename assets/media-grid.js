// ========== MEDIA GRID JAVASCRIPT ==========
// Tile video controls: per-tile pause/play toggle, reduced-motion respect,
// and pausing playback while tiles are off screen.
// Only loaded when at least one tile has a video.

(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const initItem = (item, labels) => {
    if (item.dataset.mediaGridVideoInit) return;
    item.dataset.mediaGridVideoInit = 'true';

    const video = item.querySelector('video');
    const toggle = item.querySelector('[data-media-grid-video-toggle]');
    if (!video || !toggle) return;

    // True when the visitor explicitly paused; off-screen pauses don't count
    let pausedByUser = false;

    const setState = (paused) => {
      item.classList.toggle('media-grid__item--video-paused', paused);
      toggle.setAttribute('aria-label', paused ? labels.play : labels.pause);
    };

    toggle.addEventListener('click', () => {
      if (video.paused) {
        pausedByUser = false;
        video.play().catch(() => {});
        setState(false);
      } else {
        pausedByUser = true;
        video.pause();
        setState(true);
      }
    });

    // Respect prefers-reduced-motion: don't autoplay, show the play button
    if (reducedMotion.matches) {
      pausedByUser = true;
      video.pause();
      video.removeAttribute('autoplay');
      setState(true);
    }

    // Save bandwidth and CPU: pause while scrolled out of view
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (!pausedByUser && video.paused) {
                video.play().catch(() => {});
                setState(false);
              }
            } else if (!video.paused) {
              video.pause();
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(item);
    }
  };

  const initSection = (section) => {
    const labels = {
      pause: section.dataset.pauseLabel || 'Pause video',
      play: section.dataset.playLabel || 'Play video',
    };
    section.querySelectorAll('[data-media-grid-item]').forEach((item) => initItem(item, labels));
  };

  const initAll = (root) => {
    (root || document).querySelectorAll('[data-media-grid]').forEach(initSection);
  };

  initAll();

  // Re-init when the merchant edits the section in the theme editor
  document.addEventListener('shopify:section:load', (event) => {
    initAll(event.target);
  });
})();
