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

  /* Fully dynamic: every main section becomes a chapter. No hardcoded keys.
     Add/remove/reorder sections in the theme editor — dots update automatically. */
  var sections = [];
  var mainNodes = document.querySelectorAll('#MainContent > .shopify-section');

  mainNodes.forEach(function (node, index) {
    // Skip empty / tiny utility sections
    if (node.offsetHeight < 80) return;

    var key = 'section-' + index;
    var id = node.id || '';
    // Prefer a readable key from the Shopify section id suffix
    var m = id.match(/__([a-z0-9-]+)$/i);
    if (m) key = m[1];

    var label = String(index + 1).padStart(2, '0');
    // Prefer label from section content if present
    var chapterLabelEl = node.querySelector(
      '.petlio-care__chapter-label, .outfit-builder__chapter-label, [class*="chapter-label"], [class*="__chapter-label"]'
    );
    if (chapterLabelEl && chapterLabelEl.textContent.trim()) {
      label = String(index + 1).padStart(2, '0') + ' · ' + chapterLabelEl.textContent.trim();
    } else {
      var headingEl = node.querySelector('h1, h2');
      if (headingEl && headingEl.textContent.trim()) {
        var h = headingEl.textContent.trim().replace(/\s+/g, ' ');
        if (h.length > 28) h = h.slice(0, 28) + '…';
        label = String(index + 1).padStart(2, '0') + ' · ' + h;
      }
    }

    node.classList.add('petlio-story-section', 'petlio-story-section--' + key);
    node.dataset.storyChapter = String(index + 1);
    node.dataset.storyLabel = label;

    var revealTargets = node.querySelectorAll(
      'h1, h2, h3, .hero__content, .shop-by-pet__card, .featured-products__product, .outfit-builder__item, .outfit-builder__card, .lookbook-gallery__item, .lookbook__hotspot, .testimonial, .newsletter__content'
    );
    for (var i = 0; i < revealTargets.length; i++) {
      revealTargets[i].classList.add('petlio-story-reveal');
    }

    sections.push({ element: node, chapter: { key: key, label: label } });
  });

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

    function updateProgressDots() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var probe = vh * 0.35;
      var best = -1;
      var bestDist = Infinity;

      for (var i = 0; i < sections.length; i++) {
        var rect = sections[i].element.getBoundingClientRect();
        // Skip fully off-screen sections
        if (rect.bottom <= 0 || rect.top >= vh) continue;

        var anchor = rect.top + Math.min(rect.height * 0.2, 120);
        var dist = Math.abs(anchor - probe);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }

      // Past last section (footer): keep last dot active — never jump back to first
      if (best === -1 && sections.length) {
        var lastRect = sections[sections.length - 1].element.getBoundingClientRect();
        if (lastRect.bottom <= probe || lastRect.top < 0) {
          best = sections.length - 1;
        } else {
          best = 0;
        }
      }
      if (best < 0) best = 0;

      dots.forEach(function (dot, dotIndex) {
        var on = dotIndex === best;
        dot.classList.toggle('is-active', on);
        if (on) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
    }

    var progressTicking = false;
    function onProgressScroll() {
      if (progressTicking) return;
      progressTicking = true;
      window.requestAnimationFrame(function () {
        progressTicking = false;
        updateProgressDots();
      });
    }

    updateProgressDots();
    window.addEventListener('scroll', onProgressScroll, { passive: true });
    window.addEventListener('resize', onProgressScroll, { passive: true });
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
    // Respect theme setting: Liquid only adds this class when
    // settings.enable_paper_slide is on. Never force-enable.
    if (!document.body.classList.contains('petlio-paper-slide')) return;
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
