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

    if (!section.querySelector('.petlio-story-chapter-label')) {
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
     Paper slide (discrete): sections stay fully readable.
     When scroll crosses ~50% into another section, play a short
     automated L/R paper transition, then settle static again.
     ---------------------------------------------------------------- */
  function initPaperSlide() {
    if (!document.body.classList.contains('petlio-paper-slide')) {
      document.body.classList.add('petlio-paper-slide');
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var nodes = Array.prototype.slice.call(
      document.querySelectorAll('#MainContent > .shopify-section.petlio-story-section')
    );
    if (!nodes.length) {
      nodes = Array.prototype.slice.call(
        document.querySelectorAll('#MainContent > .shopify-section')
      );
      nodes.forEach(function (node) {
        node.classList.add('petlio-story-section');
      });
    }
    if (nodes.length < 2) return;

    nodes.forEach(function (node, i) {
      node.classList.remove('paper-from-left', 'paper-from-right');
      node.classList.add(i % 2 === 0 ? 'paper-from-left' : 'paper-from-right');
      node.classList.add('is-paper-settled');
    });

    var intensity = parseFloat(
      getComputedStyle(document.body).getPropertyValue('--petlio-paper-slide')
    );
    if (!intensity || isNaN(intensity)) intensity = 0.55;
    // Distance as % for keyframe travel
    var maxShift = Math.round(Math.min(100, Math.max(30, intensity * 110)));
    document.documentElement.style.setProperty('--petlio-paper-dist', maxShift + '%');

    var activeIndex = 0;
    var isAnimating = false;
    var cooldownUntil = 0;
    var ANIM_MS = 480;

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

    function playTransition(fromIndex, toIndex) {
      if (fromIndex === toIndex || isAnimating) return;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= nodes.length) return;

      isAnimating = true;
      cooldownUntil = Date.now() + ANIM_MS + 120;

      var outgoing = nodes[fromIndex];
      var incoming = nodes[toIndex];
      var goingDown = toIndex > fromIndex;

      // Alternating paper direction based on the incoming section's side
      var incomingFromLeft = incoming.classList.contains('paper-from-left');
      // When going down: incoming enters from its side, outgoing exits opposite
      // When going up: reverse the travel so it feels like pages flipping back
      var enterClass = incomingFromLeft ? 'paper-enter-from-left' : 'paper-enter-from-right';
      var exitClass;
      if (goingDown) {
        exitClass = incomingFromLeft ? 'paper-exit-to-right' : 'paper-exit-to-left';
      } else {
        // reverse directions for scroll-up
        enterClass = incomingFromLeft ? 'paper-enter-from-right' : 'paper-enter-from-left';
        exitClass = incomingFromLeft ? 'paper-exit-to-left' : 'paper-exit-to-right';
      }

      clearAnimClasses(outgoing);
      clearAnimClasses(incoming);
      outgoing.classList.remove('is-paper-settled');
      incoming.classList.remove('is-paper-settled');

      // Force reflow so animation restarts cleanly
      void outgoing.offsetWidth;
      void incoming.offsetWidth;

      outgoing.classList.add(exitClass);
      incoming.classList.add(enterClass);
      setActive(toIndex);

      var finished = 0;
      function onEnd(e) {
        if (e && e.target !== outgoing && e.target !== incoming) return;
        finished += 1;
        if (finished < 2) return;
        outgoing.removeEventListener('animationend', onEnd);
        incoming.removeEventListener('animationend', onEnd);
        clearAnimClasses(outgoing);
        clearAnimClasses(incoming);
        outgoing.classList.add('is-paper-settled');
        incoming.classList.add('is-paper-settled');
        isAnimating = false;
      }

      outgoing.addEventListener('animationend', onEnd);
      incoming.addEventListener('animationend', onEnd);
      // Safety timeout if animationend is missed
      setTimeout(function () {
        if (!isAnimating) return;
        onEnd({ target: outgoing });
        onEnd({ target: incoming });
      }, ANIM_MS + 80);
    }

    function findDominantIndex() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var mid = vh * 0.5;
      var best = activeIndex;
      var bestScore = -Infinity;

      for (var i = 0; i < nodes.length; i++) {
        var rect = nodes[i].getBoundingClientRect();
        if (rect.height < 40) continue;
        // How much of the viewport mid-band does this section own?
        var visibleTop = Math.max(rect.top, 0);
        var visibleBottom = Math.min(rect.bottom, vh);
        var visible = Math.max(0, visibleBottom - visibleTop);
        var ratio = visible / Math.min(rect.height, vh);
        // Prefer section whose center is closest to viewport center
        var center = rect.top + rect.height * 0.5;
        var dist = Math.abs(center - mid);
        var score = ratio * 2 - dist / vh;
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
      return best;
    }

    function onScrollCheck() {
      if (isAnimating) return;
      if (Date.now() < cooldownUntil) return;

      var next = findDominantIndex();
      if (next !== activeIndex) {
        var prev = activeIndex;
        activeIndex = next;
        playTransition(prev, next);
      }
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
    activeIndex = findDominantIndex();
    setActive(activeIndex);
    nodes.forEach(function (n) {
      n.classList.add('is-paper-settled');
      clearAnimClasses(n);
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaperSlide);
  } else {
    initPaperSlide();
  }

})();
