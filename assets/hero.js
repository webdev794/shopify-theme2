// ========== HERO JAVASCRIPT ==========
// Background video controls: visitor pause/play toggle, reduced-motion
// respect, and pausing playback while the section is off screen.
// Only loaded when the section has a background video.

(() => {
  const init = (wrapper) => {
    if (wrapper.dataset.heroVideoInit) return;
    wrapper.dataset.heroVideoInit = 'true';

    const video = wrapper.querySelector('.hero__video video, video.hero__video');
    const toggle = wrapper.querySelector('[data-hero-video-toggle]');
    if (!video || !toggle) return;

    const pauseLabel = toggle.getAttribute('aria-label');
    const playLabel = toggle.dataset.playLabel || 'Play video';

    // True when the visitor explicitly paused; off-screen pauses don't count
    let pausedByUser = false;

    const setState = (paused) => {
      wrapper.classList.toggle('hero--video-paused', paused);
      toggle.setAttribute('aria-label', paused ? playLabel : pauseLabel);
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
      observer.observe(wrapper);
    }
  };

  const initAll = () => {
    document.querySelectorAll('[data-hero-video-wrapper]').forEach(init);
  };

  initAll();

  // Re-init when the merchant edits the section in the theme editor
  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-hero-video-wrapper]').forEach(init);
    const wrapper = event.target.closest && event.target.closest('[data-hero-video-wrapper]');
    if (wrapper) init(wrapper);
  });
})();   