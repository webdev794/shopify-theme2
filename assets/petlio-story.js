/* Petlio Homepage Story System */
(function () {
  'use strict';

  if (!document.body.classList.contains('template-index')) return;

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

    var label = document.createElement('span');
    label.className = 'petlio-story-chapter-label';
    label.textContent = chapter.label;
    label.setAttribute('aria-hidden', 'true');
    section.appendChild(label);

    var revealTargets = section.querySelectorAll('h1, h2, h3, .hero__content, .shop-by-pet__card, .featured-products__product, .outfit-builder__item, .lookbook-gallery__item, .lookbook__hotspot, .testimonial, .newsletter__content');
    for (var i = 0; i < revealTargets.length; i++) {
      revealTargets[i].classList.add('petlio-story-reveal');
    }

    sections.push({ element: section, chapter: chapter });
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
})();
