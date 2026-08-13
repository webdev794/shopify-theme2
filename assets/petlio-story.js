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
     Paper slide: alternating L/R entrance + exit while scrolling
     ---------------------------------------------------------------- */
  function initPaperSlide() {
    // Auto-enable if setting class missing but we're on index (helps when
    // settings_data hasn't saved the default yet)
    if (!document.body.classList.contains('petlio-paper-slide')) {
      // Only auto-add when the theme setting default is intended on;
      // still respect reduced-motion below.
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

    nodes.forEach(function (node, i) {
      node.classList.remove('paper-from-left', 'paper-from-right');
      node.classList.add(i % 2 === 0 ? 'paper-from-left' : 'paper-from-right');
    });

    if (!nodes.length) return;

    var intensity = parseFloat(
      getComputedStyle(document.body).getPropertyValue('--petlio-paper-slide')
    );
    if (!intensity || isNaN(intensity)) intensity = 0.7;
    // maxShift as % of section width — higher = more obvious slide
    var maxShift = Math.round(Math.min(90, Math.max(25, intensity * 120)));

    var ticking = false;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function updatePapers() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      nodes.forEach(function (section) {
        var rect = section.getBoundingClientRect();
        var h = Math.max(rect.height, 1);

        // t > 0 → section center still below viewport center (entering)
        // t < 0 → section center above viewport center (leaving)
        var center = rect.top + h * 0.5;
        var viewCenter = vh * 0.45;
        var t = (center - viewCenter) / vh;

        var fromLeft = section.classList.contains('paper-from-left');
        var enterDir = fromLeft ? -1 : 1;
        var exitDir = -enterDir;

        var x = 0;
        var opacity = 1;
        var scale = 1;

        if (t > 0.08) {
          // Entering from below / side
          var p = Math.min(1, (t - 0.08) / 0.75);
          p = easeOutCubic(p);
          x = enterDir * maxShift * p;
          opacity = 1 - p * 0.28;
          scale = 1 - p * 0.035;
        } else if (t < -0.08) {
          // Leaving upward / opposite side
          var p2 = Math.min(1, (-t - 0.08) / 0.75);
          p2 = easeOutCubic(p2);
          x = exitDir * maxShift * p2;
          opacity = 1 - p2 * 0.35;
          scale = 1 - p2 * 0.04;
        }

        section.style.setProperty('--paper-x', x.toFixed(2) + '%');
        section.style.setProperty('--paper-opacity', opacity.toFixed(3));
        section.style.setProperty('--paper-scale', scale.toFixed(4));

        if (Math.abs(t) < 0.6) {
          section.classList.add('is-paper-active');
        } else {
          section.classList.remove('is-paper-active');
        }
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updatePapers);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Run after layout settles
    updatePapers();
    setTimeout(updatePapers, 80);
    setTimeout(updatePapers, 320);
  }

  // Defer paper init slightly so section classes from above are applied
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPaperSlide);
  } else {
    initPaperSlide();
  }

})();