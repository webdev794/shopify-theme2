/* Petlio Homepage Story System */
(function () {
  'use strict';

  // Run only on homepage. Prefer body class; fall back to path.
  var path = window.location.pathname || '/';
  var isIndex =
    document.body.classList.contains('template-index') ||
    path === '/' ||
    path === '';

  if (!isIndex) return;

  // Ensure body has the class used by CSS even if theme.liquid was cached
  document.body.classList.add('template-index');

  var chapters = [
    { key: 'hero', label: '01 · Meet them' },
    { key: 'shop-by-pet', label: '02 · Discover' },
    { key: 'featured-products', label: '03 · Everyday' },
    { key: 'outfit-builder', label: '04 · Build' },
    { key: 'lookbook-gallery', label: '05 · See them' },
    { key: 'lookbook', label: '06 · Explore' },
    { key: 'text-with-icons', label: '07 · Why Petlio' },
    { key: 'blog-posts', label: '08 · Care & stories' },
    { key: 'faq', label: '09 · Help' },
    { key: 'testimonials', label: '10 · From the community' },
    { key: 'newsletter', label: '11 · Stay close' }
  ];

  function findSection(key) {
    var nodes = document.querySelectorAll('#MainContent > .shopify-section');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if ((node.id || '').indexOf('__' + key) !== -1) return node;
      if (node.querySelector('[data-section-type="' + key + '"]')) return node;
      // Also match common Shopify section id patterns: shopify-section-template--xxx__key
      if ((node.id || '').indexOf(key) !== -1) return node;
    }
    return null;
  }

  var sections = [];

  chapters.forEach(function (chapter, index) {
    var section = findSection(chapter.key);
    if (!section) return;

    section.classList.add('petlio-story-section', 'petlio-story-section--' + chapter.key);
    section.dataset.storyChapter = String(index + 1);
    section.dataset.storyLabel = chapter.label;

    // Prefer liquid chapter-header; only inject JS label when none exists
    if (!section.querySelector('.petlio-story-chapter-label') &&
        !section.querySelector('.petlio-chapter')) {
      var label = document.createElement('span');
      label.className = 'petlio-story-chapter-label';
      label.textContent = chapter.label;
      label.setAttribute('aria-hidden', 'true');
      section.appendChild(label);
    }

    var revealTargets = section.querySelectorAll('h1, h2, h3, .hero__content, .shop-by-pet__card, .featured-products__product, .outfit-builder__item, .lookbook-gallery__item, .lookbook__hotspot, .testimonial, .newsletter__content');
    for (var i = 0; i < revealTargets.length; i++) {
      revealTargets[i].classList.add('petlio-story-reveal');
    }

    sections.push({ element: section, chapter: chapter });
  });

  // If chapter matching failed (renamed sections), still tag all main sections
  if (!sections.length) {
    var all = document.querySelectorAll('#MainContent > .shopify-section');
    all.forEach(function (node, index) {
      node.classList.add('petlio-story-section');
      sections.push({ element: node, chapter: { key: 'section-' + index, label: String(index + 1).padStart(2, '0') } });
    });
  }

  if (!sections.length) return;

  /* Reveal content as the user enters each chapter. */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.petlio-story-reveal').forEach(function (element) {
      revealObserver.observe(element);
    });
  } else {
    document.querySelectorAll('.petlio-story-reveal').forEach(function (element) {
      element.classList.add('is-visible');
    });
  }

  /* Quiet chapter navigation on desktop. */
  if (sections.length > 3 && window.matchMedia('(min-width: 750px)').matches) {
    var rail = document.createElement('nav');
    rail.className = 'petlio-story-progress';
    rail.setAttribute('aria-label', 'Homepage sections');

    var dots = [];

    sections.forEach(function (item, index) {
      var dot = document.createElement('button');
      dot.className = 'petlio-story-progress__dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Go to ' + item.chapter.label);
      dot.title = item.chapter.label;
      dot.addEventListener('click', function () {
        item.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      rail.appendChild(dot);
      dots.push(dot);
    });

    document.body.appendChild(rail);

    if ('IntersectionObserver' in window) {
      var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var index = sections.findIndex(function (item) {
            return item.element === entry.target;
          });
          if (index === -1) return;
          dots.forEach(function (dot, dotIndex) {
            dot.classList.toggle('is-active', dotIndex === index);
          });
        });
      }, { threshold: 0.25, rootMargin: '-15% 0px -55% 0px' });

      sections.forEach(function (item) {
        sectionObserver.observe(item.element);
      });
    }
  }


  /* ----------------------------------------------------------------
     Paper slide (discrete, enter-only):
     - Sections stay fully readable while active (no continuous drift).
     - When scroll makes a new section dominant (~midpoint), it plays a
       short enter animation from alternating L/R, then settles static.
     - No exit transform (avoids the "slide away then snap back" glitch).
     - Every main homepage section participates, not only chapter-matched ones.
     ---------------------------------------------------------------- */
  function initPaperSlide() {
    if (!document.body.classList.contains('petlio-paper-slide')) {
      document.body.classList.add('petlio-paper-slide');
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ALWAYS use every top-level homepage section so none are skipped
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll('#MainContent > .shopify-section')
    );
    if (nodes.length < 2) return;

    nodes.forEach(function (node, i) {
      node.classList.add('petlio-story-section');
      node.classList.remove('paper-from-left', 'paper-from-right');
      node.classList.add(i % 2 === 0 ? 'paper-from-left' : 'paper-from-right');
      node.classList.add('is-paper-settled');
      // Ensure positioning context for chapter labels
      if (getComputedStyle(node).position === 'static') {
        node.style.position = 'relative';
      }
    });

    var intensity = parseFloat(
      getComputedStyle(document.body).getPropertyValue('--petlio-paper-slide')
    );
    if (!intensity || isNaN(intensity)) intensity = 0.55;
    var maxShift = Math.round(Math.min(90, Math.max(28, intensity * 100)));
    document.documentElement.style.setProperty('--petlio-paper-dist', maxShift + '%');

    var activeIndex = -1;
    var isAnimating = false;
    var cooldownUntil = 0;
    var ANIM_MS = 520;
    // Hysteresis: require a clear lead before switching to avoid flip-flop
    var SWITCH_MARGIN = 0.12;

    function setActive(index) {
      nodes.forEach(function (node, i) {
        node.classList.toggle('is-paper-active', i === index);
      });
    }

    function clearAnimClasses(node) {
      node.classList.remove(
        'paper-enter-from-left',
        'paper-enter-from-right',
        'paper-exit-to-left',
        'paper-exit-to-right'
      );
    }

    function playEnter(toIndex) {
      if (toIndex < 0 || toIndex >= nodes.length) return;
      if (isAnimating) return;

      isAnimating = true;
      cooldownUntil = Date.now() + ANIM_MS + 100;

      var incoming = nodes[toIndex];
      var fromLeft = incoming.classList.contains('paper-from-left');
      var enterClass = fromLeft ? 'paper-enter-from-left' : 'paper-enter-from-right';

      clearAnimClasses(incoming);
      incoming.classList.remove('is-paper-settled');
      void incoming.offsetWidth; // restart animation

      incoming.classList.add(enterClass);
      setActive(toIndex);

      function finish() {
        clearAnimClasses(incoming);
        incoming.classList.add('is-paper-settled');
        isAnimating = false;
      }

      function onEnd(e) {
        if (e && e.target !== incoming) return;
        incoming.removeEventListener('animationend', onEnd);
        finish();
      }
      incoming.addEventListener('animationend', onEnd);
      setTimeout(function () {
        if (!isAnimating) return;
        incoming.removeEventListener('animationend', onEnd);
        finish();
      }, ANIM_MS + 60);
    }

    function scoreSection(node, vh, mid) {
      var rect = node.getBoundingClientRect();
      if (rect.height < 48) return -Infinity;
      var visibleTop = Math.max(rect.top, 0);
      var visibleBottom = Math.min(rect.bottom, vh);
      var visible = Math.max(0, visibleBottom - visibleTop);
      if (visible < 1) return -Infinity;
      var ratio = visible / Math.min(rect.height, vh);
      var center = rect.top + rect.height * 0.5;
      var dist = Math.abs(center - mid) / vh;
      // Strong weight on visibility + proximity of section center to viewport center
      return ratio * 1.6 - dist;
    }

    function findDominantIndex() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var mid = vh * 0.48;
      var best = 0;
      var bestScore = -Infinity;
      var second = -Infinity;

      for (var i = 0; i < nodes.length; i++) {
        var s = scoreSection(nodes[i], vh, mid);
        if (s > bestScore) {
          second = bestScore;
          bestScore = s;
          best = i;
        } else if (s > second) {
          second = s;
        }
      }
      return { index: best, score: bestScore, margin: bestScore - second };
    }

    function onScrollCheck() {
      if (isAnimating) return;
      if (Date.now() < cooldownUntil) return;

      var result = findDominantIndex();
      var next = result.index;

      // First time: set active without animation
      if (activeIndex < 0) {
        activeIndex = next;
        setActive(activeIndex);
        return;
      }

      if (next === activeIndex) return;

      // Require a clear dominant section before switching (hysteresis)
      if (result.margin < SWITCH_MARGIN && result.score < 0.55) return;

      activeIndex = next;
      playEnter(next);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        onScrollCheck();
      });
    }

    // Initial settle — no animation on first paint
    nodes.forEach(function (n) {
      n.classList.add('is-paper-settled');
      clearAnimClasses(n);
    });
    var initial = findDominantIndex();
    activeIndex = initial.index;
    setActive(activeIndex);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaperSlide);
  } else {
    // Defer one frame so section layout/classes from above are ready
    requestAnimationFrame(initPaperSlide);
  }

})();
