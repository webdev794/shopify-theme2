// ========== HIGHLIGHT TEXT WITH IMAGES JAVASCRIPT ==========
// Staggered reveal on scroll. Only loaded when the merchant enables the
// effect. The hidden starting state is applied by the .hlt--ready class
// added here — so without JavaScript the section simply renders visible.

(() => {
  const initSection = (section) => {
    if (section.dataset.hltInit) return;
    section.dataset.hltInit = 'true';

    if (!('IntersectionObserver' in window)) return;

    section.classList.add('hlt--ready');

    // Already in the viewport on load (e.g. first section): reveal on the
    // next frame so the transition still plays once.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add('hlt--visible');
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(section);
  };

  const initAll = (root) => {
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    scope.querySelectorAll('[data-hlt]').forEach(initSection);
  };

  initAll();

  // Re-init when the merchant edits the section in the theme editor;
  // replay the reveal so they can preview the effect after each change.
  document.addEventListener('shopify:section:load', (event) => {
    initAll(event.target);
  });
})();
