// ========== MEDIA GRID JAVASCRIPT ==========

(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Video ---------- */
  const initItem = (item, labels) => {
    if (item.dataset.mediaGridVideoInit) return;
    item.dataset.mediaGridVideoInit = 'true';

    const video = item.querySelector('video');
    const toggle = item.querySelector('[data-media-grid-video-toggle]');
    if (!video || !toggle) return;

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

    if (reducedMotion.matches) {
      pausedByUser = true;
      video.pause();
      video.removeAttribute('autoplay');
      setState(true);
    }

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

  const initVideos = (section) => {
    const labels = {
      pause: section.dataset.pauseLabel || 'Pause video',
      play: section.dataset.playLabel || 'Play video',
    };
    section.querySelectorAll('[data-media-grid-item]').forEach((item) => initItem(item, labels));
  };

  /* ---------- Entry animation ---------- */
  const initEntry = (section) => {
    if (!section.hasAttribute('data-media-grid-entry')) return;
    if (section.dataset.mediaGridEntryInit) return;
    section.dataset.mediaGridEntryInit = 'true';

    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      section.classList.add('is-entered');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => section.classList.add('is-entered'));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(section);
  };

  /* ---------- Image popup ---------- */
  const initPopup = (section) => {
    if (section.dataset.mediaGridPopupInit) return;
    section.dataset.mediaGridPopupInit = 'true';

    const popup = section.querySelector('.media-grid__popup');
    if (!popup) return;

    const imgEl = popup.querySelector('.media-grid__popup-image');
    const fullLink = popup.querySelector('.media-grid__popup-full');
    const triggers = section.querySelectorAll('[data-media-grid-popup]');
    if (!imgEl || !fullLink || !triggers.length) return;

    let openTimer = null;
    let closeTimer = null;

    const openPopup = (trigger) => {
      const src = trigger.dataset.popupSrc || trigger.dataset.fullSrc;
      const full = trigger.dataset.fullSrc || src;
      const alt = trigger.dataset.alt || '';
      if (!src) return;

      imgEl.src = src;
      imgEl.alt = alt;
      fullLink.href = full;

      popup.hidden = false;
      popup.setAttribute('aria-hidden', 'false');
      void popup.offsetWidth;
      popup.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };

    const closePopup = () => {
      popup.classList.remove('is-open');
      popup.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      window.setTimeout(() => {
        if (!popup.classList.contains('is-open')) {
          popup.hidden = true;
          imgEl.removeAttribute('src');
        }
      }, 300);
    };

    const clearTimers = () => {
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    };

    // Only auto-open the preview on hover when the section's "Zoom media on
    // hover" setting is on (media-grid--zoom class present on the section).
    // Touch devices, and desktop with that setting off, fall back to tap/click.
    const hoverZoomEnabled = section.classList.contains('media-grid--zoom');

    if (canHover.matches && hoverZoomEnabled) {
      triggers.forEach((trigger) => {
        trigger.addEventListener('mouseenter', () => {
          clearTimers();
          openTimer = setTimeout(() => openPopup(trigger), 160);
        });
        trigger.addEventListener('mouseleave', () => {
          clearTimers();
          closeTimer = setTimeout(() => {
            if (!popup.matches(':hover')) closePopup();
          }, 180);
        });
      });

      popup.addEventListener('mouseenter', clearTimers);
      popup.addEventListener('mouseleave', () => {
        clearTimers();
        closeTimer = setTimeout(closePopup, 120);
      });
    } else {
      // Touch, or hover-zoom disabled: tap/click opens popup; button opens full image in new tab
      triggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openPopup(trigger);
        });
      });
    }

    popup.querySelectorAll('[data-media-grid-popup-close]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        closePopup();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.classList.contains('is-open')) {
        closePopup();
      }
    });
  };

  /* ---------- Boot ---------- */
  const initSection = (section) => {
    initVideos(section);
    initEntry(section);
    initPopup(section);
  };

  const initAll = (root) => {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('[data-media-grid]').forEach(initSection);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector('[data-media-grid]') || event.target;
    if (section && section.matches && section.matches('[data-media-grid]')) {
      section.dataset.mediaGridEntryInit = '';
      section.dataset.mediaGridPopupInit = '';
      section.classList.remove('is-entered');
      initSection(section);
    } else {
      initAll(event.target);
    }
  });
})();