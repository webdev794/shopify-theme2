/**
 * PETLIO — SCROLL BIRD
 * ============================================================
 * A realistic songbird on the right edge of the page.
 *
 * - Flies (wing flap + vertical travel) while the user scrolls
 * - When scrolling stops, lands and sits on a perch line
 *   of the current section
 *
 * Respects prefers-reduced-motion and coarse pointers.
 * Desktop only (matches CSS media queries).
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

  /* ----------------------------------------------------------
     CONFIG
     ---------------------------------------------------------- */

  var IDLE_MS = 220;
  var LERP_FLY = 0.12;
  var LERP_LAND = 0.18;
  var BIRD_HEIGHT = 48;
  var RIGHT_OFFSET = 24;
  var PERCH_OFFSET_Y = 0.18; // fraction of section height

  /* ----------------------------------------------------------
     SVG — muted sparrow / songbird
     ---------------------------------------------------------- */

  var BIRD_SVG =
    '<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    // soft body shadow
    '<ellipse cx="30" cy="48" rx="14" ry="3" fill="rgba(39,48,40,0.12)"/>' +
    // body
    '<g class="scroll-bird__body">' +
    '<ellipse cx="30" cy="30" rx="16" ry="11" fill="#6B5B4F"/>' +
    '<ellipse cx="30" cy="29" rx="13" ry="8" fill="#8A7A6A"/>' +
    // belly
    '<ellipse cx="28" cy="33" rx="9" ry="6" fill="#C9B8A0"/>' +
    // head
    '<circle cx="42" cy="22" r="9" fill="#5C4F45"/>' +
    '<circle cx="42" cy="21" r="7" fill="#7A6B5C"/>' +
    // cheek
    '<circle cx="45" cy="24" r="3.2" fill="#B9A48A" opacity="0.7"/>' +
    // eye
    '<circle cx="46" cy="20" r="2.1" fill="#1E2420"/>' +
    '<circle cx="46.6" cy="19.4" r="0.7" fill="#F5F0E8"/>' +
    // beak
    '<path d="M50 22 L58 23.5 L50 25.5 Z" fill="#C4783A"/>' +
    '<path d="M50 22.8 L56.5 23.5 L50 24.6 Z" fill="#E09A55"/>' +
    // tail
    '<path d="M14 28 C8 26 4 30 6 36 C10 34 14 32 16 30 Z" fill="#4A4038"/>' +
    '<path d="M15 29 C10 28 7 31 8 34 C11 33 14 31 16 30 Z" fill="#6B5B4F"/>' +
    // feet (subtle when perched)
    '<path d="M26 40 L24 46 M28 40 L28 46 M30 40 L32 46" stroke="#3D3530" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85"/>' +
    '</g>' +
    // wing (animated)
    '<g class="scroll-bird__wing">' +
    '<path d="M22 26 C12 18 8 10 14 8 C20 6 28 14 32 22 C30 26 26 28 22 26 Z" fill="#5A4E44"/>' +
    '<path d="M23 25 C15 18 12 12 16 11 C20 10 27 16 30 22 C28 25 25 27 23 25 Z" fill="#7A6B5C"/>' +
    '<path d="M24 24 C18 18 16 14 18 13.5 C20 13 25 17 28 22" stroke="#C9B8A0" stroke-width="0.8" fill="none" opacity="0.5"/>' +
    '</g>' +
    '</svg>';

  /* ----------------------------------------------------------
     DOM
     ---------------------------------------------------------- */

  var root = document.createElement('div');
  root.id = 'scroll-bird-root';

  var bird = document.createElement('div');
  bird.id = 'scroll-bird';
  bird.setAttribute('aria-hidden', 'true');
  bird.innerHTML = BIRD_SVG;

  root.appendChild(bird);
  document.body.appendChild(root);

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */

  var targetY = window.innerHeight * 0.35;
  var currentY = targetY;
  var velocity = 0;
  var lastScrollY = window.scrollY || window.pageYOffset;
  var lastScrollTime = performance.now();
  var isScrolling = false;
  var idleTimer = null;
  var rafId = null;
  // Face left (toward page content) — bird sits on the right edge looking inward
  var facingRight = false;
  var perches = [];

  /* ----------------------------------------------------------
     SECTIONS & PERCHES
     ---------------------------------------------------------- */

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
      if (section.querySelector('.scroll-bird-perch')) {
        var existing = section.querySelector('.scroll-bird-perch');
        perches.push({ section: section, perch: existing });
        return;
      }

      // Only add perch if section has some height
      if (section.offsetHeight < 120) return;

      var perch = document.createElement('div');
      perch.className = 'scroll-bird-perch';
      perch.setAttribute('aria-hidden', 'true');
      section.appendChild(perch);
      perches.push({ section: section, perch: perch });
    });
  }

  function getActivePerchY() {
    var viewMid = window.scrollY + window.innerHeight * 0.4;
    var best = null;
    var bestDist = Infinity;

    perches.forEach(function (item) {
      var rect = item.section.getBoundingClientRect();
      var sectionTop = rect.top + window.scrollY;
      var sectionBottom = sectionTop + rect.height;
      var perchY = sectionTop + rect.height * PERCH_OFFSET_Y;

      // Prefer section whose perch is near the upper-middle of the viewport
      var dist = Math.abs(perchY - viewMid);
      if (viewMid >= sectionTop - 40 && viewMid <= sectionBottom + 40) {
        if (dist < bestDist) {
          bestDist = dist;
          best = perchY;
        }
      }
    });

    if (best !== null) {
      // Convert document Y to viewport-relative fixed position
      return best - window.scrollY - BIRD_HEIGHT * 0.55;
    }

    // Fallback: stay in the upper third of the viewport
    return window.innerHeight * 0.28;
  }

  /* ----------------------------------------------------------
     ANIMATION LOOP
     ---------------------------------------------------------- */

  function setState(state) {
    bird.classList.remove('is-flying', 'is-landing', 'is-perched');
    if (state) bird.classList.add(state);
  }

  function tick() {
    var lerp = isScrolling ? LERP_FLY : LERP_LAND;
    var prev = currentY;
    currentY += (targetY - currentY) * lerp;
    velocity = currentY - prev;

    // Always face left toward the page content
    facingRight = false;

    var scaleX = facingRight ? 1 : -1;
    // slight bank while flying
    var bank = isScrolling ? Math.max(-10, Math.min(10, velocity * 1.8)) : 0;

    bird.style.transform =
      'translate3d(0, ' +
      currentY.toFixed(2) +
      'px, 0) scaleX(' +
      scaleX +
      ') rotate(' +
      bank.toFixed(2) +
      'deg)';

    rafId = requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------
     SCROLL HANDLING
     ---------------------------------------------------------- */

  function onScroll() {
    var now = performance.now();
    var sy = window.scrollY || window.pageYOffset;
    var delta = sy - lastScrollY;
    lastScrollY = sy;
    lastScrollTime = now;

    if (!isScrolling) {
      isScrolling = true;
      setState('is-flying');
    }

    // While scrolling, bird drifts with scroll direction and stays
    // roughly in the middle-right of the viewport with some parallax
    var progress = sy / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var base = window.innerHeight * (0.22 + progress * 0.35);
    // add a little reactive offset from scroll delta
    targetY = base + Math.max(-40, Math.min(40, delta * 0.35));
    targetY = Math.max(48, Math.min(window.innerHeight - BIRD_HEIGHT - 24, targetY));

    clearTimeout(idleTimer);
    idleTimer = setTimeout(onIdle, IDLE_MS);
  }

  function onIdle() {
    isScrolling = false;
    setState('is-landing');

    // After settle animation, mark as perched
    setTimeout(function () {
      if (!isScrolling) setState('is-perched');
    }, 420);

    targetY = getActivePerchY();
    targetY = Math.max(40, Math.min(window.innerHeight - BIRD_HEIGHT - 20, targetY));
  }

  function onResize() {
    ensurePerches();
    if (!isScrolling) {
      targetY = getActivePerchY();
    }
  }

  /* ----------------------------------------------------------
     INIT
     ---------------------------------------------------------- */

  function init() {
    ensurePerches();

    // Start near the first perch or upper viewport
    targetY = getActivePerchY();
    currentY = targetY;
    bird.style.transform = 'translate3d(0, ' + currentY + 'px, 0)';
    setState('is-perched');

    // Reveal after a short beat so it feels intentional
    requestAnimationFrame(function () {
      bird.classList.add('is-ready');
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    // Re-scan sections after Shopify theme editor / dynamic loads
    if (typeof MutationObserver !== 'undefined') {
      var main = document.getElementById('MainContent');
      if (main) {
        var mo = new MutationObserver(function () {
          ensurePerches();
        });
        mo.observe(main, { childList: true, subtree: false });
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
