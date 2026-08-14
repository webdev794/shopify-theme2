/**
 * PETLIO — SCROLL BIRD
 * ============================================================
 * Songbird on the right edge of the page.
 *
 * - Flies (wing flap + vertical travel) while the user scrolls
 * - When scrolling stops, lands on a perch line of the current section
 * - Always faces left (toward page content)
 *
 * Respects prefers-reduced-motion and coarse pointers. Desktop only.
 */

(function () {
  'use strict';

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var coarsePointer =
    window.matchMedia &&
    window.matchMedia('(pointer: coarse)').matches;

  var isNarrow =
    window.matchMedia &&
    window.matchMedia('(max-width: 989px)').matches;

  if (reduceMotion || coarsePointer || isNarrow) {
    return;
  }

  var IDLE_MS = 180;
  var LERP_FLY = 0.22;
  var LERP_LAND = 0.16;
  var BIRD_HEIGHT = 48;
  var PERCH_OFFSET_Y = 0.16;

  var BIRD_SVG =
    '<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<ellipse cx="30" cy="48" rx="14" ry="3" fill="rgba(39,48,40,0.12)"/>' +
    '<g class="scroll-bird__body">' +
    '<ellipse cx="30" cy="30" rx="16" ry="11" fill="#6B5B4F"/>' +
    '<ellipse cx="30" cy="29" rx="13" ry="8" fill="#8A7A6A"/>' +
    '<ellipse cx="28" cy="33" rx="9" ry="6" fill="#C9B8A0"/>' +
    '<circle cx="42" cy="22" r="9" fill="#5C4F45"/>' +
    '<circle cx="42" cy="21" r="7" fill="#7A6B5C"/>' +
    '<circle cx="45" cy="24" r="3.2" fill="#B9A48A" opacity="0.7"/>' +
    '<circle cx="46" cy="20" r="2.1" fill="#1E2420"/>' +
    '<circle cx="46.6" cy="19.4" r="0.7" fill="#F5F0E8"/>' +
    '<path d="M50 22 L58 23.5 L50 25.5 Z" fill="#C4783A"/>' +
    '<path d="M50 22.8 L56.5 23.5 L50 24.6 Z" fill="#E09A55"/>' +
    '<path d="M14 28 C8 26 4 30 6 36 C10 34 14 32 16 30 Z" fill="#4A4038"/>' +
    '<path d="M15 29 C10 28 7 31 8 34 C11 33 14 31 16 30 Z" fill="#6B5B4F"/>' +
    '<path d="M26 40 L24 46 M28 40 L28 46 M30 40 L32 46" stroke="#3D3530" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85"/>' +
    '</g>' +
    '<g class="scroll-bird__wing">' +
    '<path d="M22 26 C12 18 8 10 14 8 C20 6 28 14 32 22 C30 26 26 28 22 26 Z" fill="#5A4E44"/>' +
    '<path d="M23 25 C15 18 12 12 16 11 C20 10 27 16 30 22 C28 25 25 27 23 25 Z" fill="#7A6B5C"/>' +
    '<path d="M24 24 C18 18 16 14 18 13.5 C20 13 25 17 28 22" stroke="#C9B8A0" stroke-width="0.8" fill="none" opacity="0.5"/>' +
    '</g>' +
    '</svg>';

  function mount() {
    if (document.getElementById('scroll-bird')) return;

    var root = document.createElement('div');
    root.id = 'scroll-bird-root';

    var bird = document.createElement('div');
    bird.id = 'scroll-bird';
    bird.setAttribute('aria-hidden', 'true');
    bird.innerHTML = BIRD_SVG;

    root.appendChild(bird);
    document.body.appendChild(root);

    start(bird);
  }

  function start(bird) {
    var targetY = window.innerHeight * 0.32;
    var currentY = targetY;
    var velocity = 0;
    var lastScrollY = window.scrollY || window.pageYOffset;
    var isScrolling = false;
    var idleTimer = null;
    var perches = [];

    function getMainSections() {
      var main = document.getElementById('MainContent');
      if (!main) return [];
      return Array.prototype.slice.call(
        main.querySelectorAll(':scope > .shopify-section')
      );
    }

    function ensurePerches() {
      var sections = getMainSections();
      perches = [];

      sections.forEach(function (section) {
        if (section.offsetHeight < 100) return;

        var perch = section.querySelector('.scroll-bird-perch');
        if (!perch) {
          perch = document.createElement('div');
          perch.className = 'scroll-bird-perch';
          perch.setAttribute('aria-hidden', 'true');
          section.appendChild(perch);
        }
        perches.push({ section: section, perch: perch });
      });
    }

    function getActivePerchY() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var probe = vh * 0.38;
      var best = null;
      var bestDist = Infinity;

      perches.forEach(function (item) {
        var rect = item.section.getBoundingClientRect();
        if (rect.bottom < 40 || rect.top > vh - 40) return;

        var perchLocal = rect.height * PERCH_OFFSET_Y;
        var perchViewportY = rect.top + perchLocal;
        var dist = Math.abs(perchViewportY - probe);

        if (dist < bestDist) {
          bestDist = dist;
          best = perchViewportY - BIRD_HEIGHT * 0.55;
        }
      });

      if (best !== null) {
        return Math.max(36, Math.min(vh - BIRD_HEIGHT - 16, best));
      }
      return vh * 0.28;
    }

    function setState(state) {
      bird.classList.remove('is-flying', 'is-landing', 'is-perched');
      if (state) bird.classList.add(state);
    }

    function tick() {
      var lerp = isScrolling ? LERP_FLY : LERP_LAND;
      var prev = currentY;
      currentY += (targetY - currentY) * lerp;
      velocity = currentY - prev;

      var bank = isScrolling ? Math.max(-12, Math.min(12, velocity * 2.2)) : 0;

      bird.style.transform =
        'translate3d(0, ' +
        currentY.toFixed(2) +
        'px, 0) scaleX(-1) rotate(' +
        bank.toFixed(2) +
        'deg)';

      requestAnimationFrame(tick);
    }

    function onScroll() {
      var sy = window.scrollY || window.pageYOffset;
      var delta = sy - lastScrollY;
      lastScrollY = sy;

      if (!isScrolling) {
        isScrolling = true;
        setState('is-flying');
      }

      var docH = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      var progress = Math.max(0, Math.min(1, sy / docH));

      var base = window.innerHeight * (0.14 + progress * 0.62);
      targetY = base + Math.max(-56, Math.min(56, delta * 0.55));
      targetY = Math.max(
        40,
        Math.min(window.innerHeight - BIRD_HEIGHT - 20, targetY)
      );

      clearTimeout(idleTimer);
      idleTimer = setTimeout(onIdle, IDLE_MS);
    }

    function onIdle() {
      isScrolling = false;
      setState('is-landing');

      setTimeout(function () {
        if (!isScrolling) setState('is-perched');
      }, 400);

      targetY = getActivePerchY();
    }

    function onResize() {
      ensurePerches();
      if (!isScrolling) {
        targetY = getActivePerchY();
      }
    }

    ensurePerches();
    targetY = getActivePerchY();
    currentY = targetY;
    bird.style.transform =
      'translate3d(0, ' + currentY + 'px, 0) scaleX(-1)';
    setState('is-perched');

    requestAnimationFrame(function () {
      bird.classList.add('is-ready');
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    if (typeof MutationObserver !== 'undefined') {
      var main = document.getElementById('MainContent');
      if (main) {
        var mo = new MutationObserver(function () {
          ensurePerches();
        });
        mo.observe(main, { childList: true, subtree: false });
      }
    }

    requestAnimationFrame(tick);
    onScroll();
    onIdle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
