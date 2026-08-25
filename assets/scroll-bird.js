/**
 * PETLIO — SCROLL PHOENIX
 * ============================================================
 * A legendary firebird on the right edge of the page.
 *
 * - Flies (wing flap + vertical travel) while the user scrolls, trailing
 *   embers behind it
 * - When scrolling stops, lands on a perch line of the current section
 *   with a small flourish of sparks
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
  var BIRD_HEIGHT = 52;
  var PERCH_OFFSET_Y = 0.16;
  var EMBER_INTERVAL_MS = 65;
  var FLEE_RADIUS = 150;
  var FLEE_CHECK_MS = 120;
  var FLEE_COOLDOWN_MS = 1700;
  var STARTLE_MS = 180;
  var EMBER_COLORS = [
    'radial-gradient(circle, #fff3c4 0%, #ffb04d 45%, rgba(255, 90, 30, 0) 75%)',
    'radial-gradient(circle, #ffe08a 0%, #ff7a3d 45%, rgba(220, 60, 20, 0) 75%)',
    'radial-gradient(circle, #ffd39e 0%, #ff9a3c 45%, rgba(255, 120, 40, 0) 75%)'
  ];

  var PHOENIX_SVG =
    '<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="phoenixBody" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#ffd98a"/>' +
    '<stop offset="45%" stop-color="#ff8a3d"/>' +
    '<stop offset="100%" stop-color="#c8412a"/>' +
    '</linearGradient>' +
    '<linearGradient id="phoenixWing" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#ffe28a"/>' +
    '<stop offset="50%" stop-color="#ff9a3c"/>' +
    '<stop offset="100%" stop-color="#e2432a"/>' +
    '</linearGradient>' +
    '<linearGradient id="phoenixTail" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#fff1b8"/>' +
    '<stop offset="40%" stop-color="#ffb14d"/>' +
    '<stop offset="75%" stop-color="#ff6a3d"/>' +
    '<stop offset="100%" stop-color="#c8302a"/>' +
    '</linearGradient>' +
    '<radialGradient id="phoenixGlow" cx="50%" cy="50%" r="50%">' +
    '<stop offset="0%" stop-color="#ffdd8a" stop-opacity="0.85"/>' +
    '<stop offset="60%" stop-color="#ff9a3c" stop-opacity="0.3"/>' +
    '<stop offset="100%" stop-color="#ff9a3c" stop-opacity="0"/>' +
    '</radialGradient>' +
    '</defs>' +
    '<ellipse cx="30" cy="48" rx="14" ry="3" fill="rgba(180,60,30,0.12)"/>' +
    '<ellipse class="scroll-bird__aura" cx="30" cy="27" rx="27" ry="23" fill="url(#phoenixGlow)"/>' +
    '<g class="scroll-bird__tail">' +
    '<path d="M22 30 C10 34 2 44 4 52 C10 48 16 42 22 34 Z" fill="url(#phoenixTail)"/>' +
    '<path d="M24 29 C14 30 4 36 2 44 C9 42 17 37 24 32 Z" fill="url(#phoenixTail)" opacity="0.85"/>' +
    '<path d="M26 31 C18 28 8 30 4 36 C11 36 19 34 26 33 Z" fill="url(#phoenixTail)" opacity="0.7"/>' +
    '</g>' +
    '<g class="scroll-bird__body">' +
    '<path d="M38 14 C39 9 42 6 46 6 C43 10 42 13 41 16 Z" fill="url(#phoenixTail)"/>' +
    '<path d="M41 13 C43 8 47 6 51 7 C47 10 45 13 44 16 Z" fill="url(#phoenixTail)" opacity="0.85"/>' +
    '<path d="M44 15 C47 11 51 10 54 12 C50 14 47 16 46 18 Z" fill="url(#phoenixTail)" opacity="0.7"/>' +
    '<ellipse cx="30" cy="30" rx="15" ry="10" fill="url(#phoenixBody)"/>' +
    '<ellipse cx="28" cy="33" rx="9" ry="6" fill="#ffdf9e" opacity="0.55"/>' +
    '<circle cx="42" cy="22" r="9" fill="url(#phoenixBody)"/>' +
    '<circle cx="45" cy="24" r="3" fill="#ffe9b8" opacity="0.6"/>' +
    '<circle cx="46" cy="20" r="2" fill="#2a1810"/>' +
    '<circle cx="46.6" cy="19.4" r="0.7" fill="#fff6df"/>' +
    '<path d="M50 22 L59 23.3 L50 25.4 Z" fill="#ffb63d"/>' +
    '<path d="M50 22.7 L56.4 23.3 L50 24.5 Z" fill="#ffe08a"/>' +
    '<path d="M26 40 L24 46 M28 40 L28 46 M30 40 L32 46" stroke="#a5401f" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85"/>' +
    '</g>' +
    '<g class="scroll-bird__wing">' +
    '<path d="M22 26 C10 16 4 6 12 4 C20 2 30 12 34 22 C31 27 26 29 22 26 Z" fill="url(#phoenixWing)"/>' +
    '<path d="M23 25 C14 17 10 9 15 8 C20 7 28 14 31 21 C29 25 26 27 23 25 Z" fill="#ffdf9e" opacity="0.6"/>' +
    '<path d="M24 24 C17 17 14 11 17 10 C20 9 26 14 29 20" stroke="#fff4d6" stroke-width="0.8" fill="none" opacity="0.6"/>' +
    '</g>' +
    '</svg>';

  function mount() {
    if (document.getElementById('scroll-bird')) return;

    var root = document.createElement('div');
    root.id = 'scroll-bird-root';

    var bird = document.createElement('div');
    bird.id = 'scroll-bird';
    bird.setAttribute('aria-hidden', 'true');
    bird.innerHTML = PHOENIX_SVG;

    root.appendChild(bird);
    document.body.appendChild(root);

    var embers = document.createElement('div');
    embers.id = 'scroll-bird-embers';
    embers.setAttribute('aria-hidden', 'true');
    document.body.appendChild(embers);

    start(bird, embers);
  }

  function start(bird, emberContainer) {
    var targetY = window.innerHeight * 0.32;
    var currentY = targetY;
    var velocity = 0;
    var lastScrollY = window.scrollY || window.pageYOffset;
    var isScrolling = false;
    var isFleeing = false;
    var idleTimer = null;
    var perches = [];
    var lastEmberAt = 0;
    var lastFleeCheckAt = 0;
    var lastFleeAt = -Infinity;

    function spawnEmber(rect, opts) {
      if (!rect || !rect.width) return;
      opts = opts || {};

      var ember = document.createElement('span');
      ember.className = 'scroll-bird__ember';

      var size = 3 + Math.random() * 4;
      ember.style.width = size.toFixed(1) + 'px';
      ember.style.height = size.toFixed(1) + 'px';

      // Tail trails the visual-right side of the bounding box (the SVG is
      // mirrored via scaleX(-1), so the tail drawn on the left of the
      // artwork ends up on the right on screen).
      var baseX = opts.x !== undefined ? opts.x : rect.right - 8;
      var baseY =
        opts.y !== undefined ? opts.y : rect.top + rect.height * 0.6;
      var x = baseX + (Math.random() * 8 - 4);
      var y = baseY + (Math.random() * 8 - 4);

      ember.style.left = x.toFixed(1) + 'px';
      ember.style.top = y.toFixed(1) + 'px';

      var dx = (Math.random() * 20 - 10).toFixed(1) + 'px';
      var dy = (14 + Math.random() * 18).toFixed(1) + 'px';
      var duration = Math.round(550 + Math.random() * 500) + 'ms';

      ember.style.setProperty('--ember-dx', dx);
      ember.style.setProperty('--ember-dy', dy);
      ember.style.setProperty('--ember-duration', duration);
      ember.style.background =
        EMBER_COLORS[(Math.random() * EMBER_COLORS.length) | 0];

      emberContainer.appendChild(ember);
      ember.addEventListener(
        'animationend',
        function () {
          if (ember.parentNode) ember.parentNode.removeChild(ember);
        },
        { once: true }
      );
    }

    function spawnEmberBurst(rect, count) {
      for (var i = 0; i < count; i++) {
        spawnEmber(rect);
      }
    }

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

    // Same perch list, but picks whichever visible perch is FARTHEST from
    // a given point — used when fleeing, so the bird actually puts
    // distance between itself and the dog instead of picking its usual
    // "closest to center" spot.
    //
    // A perch-only pick can fail near the top/bottom of the page, where
    // often only one section is in view: the "farthest visible perch"
    // is then the bird's own perch, which looked like it never moved.
    // So this always also considers a guaranteed-far fallback (flip to
    // the opposite half of the viewport) and returns whichever of the
    // two actually ends up farther from the danger point.
    var MIN_FLEE_DISTANCE = 160;

    function clampToViewport(y, vh) {
      return Math.max(36, Math.min(vh - BIRD_HEIGHT - 16, y));
    }

    function getFleeTargetY(dangerY, fromY) {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var bestPerch = null;
      var bestPerchDist = -1;

      perches.forEach(function (item) {
        var rect = item.section.getBoundingClientRect();
        if (rect.bottom < 40 || rect.top > vh - 40) return;

        var perchLocal = rect.height * PERCH_OFFSET_Y;
        var perchViewportY = rect.top + perchLocal;
        var distFromDanger = Math.abs(perchViewportY - dangerY);
        var distFromSelf = Math.abs(perchViewportY - fromY);

        if (distFromSelf < MIN_FLEE_DISTANCE) return;

        if (distFromDanger > bestPerchDist) {
          bestPerchDist = distFromDanger;
          bestPerch = clampToViewport(
            perchViewportY - BIRD_HEIGHT * 0.55,
            vh
          );
        }
      });

      var flipped = clampToViewport(
        fromY < vh / 2 ? vh * 0.82 : vh * 0.18,
        vh
      );

      if (bestPerch === null) {
        return flipped;
      }

      var bestPerchDistFromDanger = Math.abs(bestPerch - dangerY);
      var flippedDistFromDanger = Math.abs(flipped - dangerY);

      return flippedDistFromDanger > bestPerchDistFromDanger
        ? flipped
        : bestPerch;
    }

    function setState(state) {
      bird.classList.remove(
        'is-flying',
        'is-landing',
        'is-perched',
        'is-startled'
      );
      if (state) bird.classList.add(state);
    }

    // The dog got close while the bird was sitting still — flinch, then
    // bolt to the farthest visible perch from the danger point. Clears
    // the spot the bird was occupying and adds a bit of life to the page.
    function triggerFlee(dangerX, dangerY) {
      lastFleeAt = performance.now();
      setState('is-startled');

      setTimeout(function () {
        if (isScrolling) return;

        isFleeing = true;
        setState('is-flying');
        targetY = getFleeTargetY(dangerY, currentY);

        setTimeout(function () {
          isFleeing = false;
          if (isScrolling) return;

          setState('is-landing');
          spawnEmberBurst(bird.getBoundingClientRect(), 4);

          setTimeout(function () {
            if (!isScrolling) setState('is-perched');
          }, 400);
        }, 550);
      }, STARTLE_MS);
    }

    function checkFlee(now) {
      if (isScrolling || isFleeing) return;
      if (now - lastFleeAt < FLEE_COOLDOWN_MS) return;

      var pet = window.PetlioCursorPet;
      if (!pet || typeof pet.x !== 'number' || pet.x < -1000) return;

      var rect = bird.getBoundingClientRect();
      if (!rect.width) return;

      var bx = rect.left + rect.width / 2;
      var by = rect.top + rect.height / 2;
      var dist = Math.hypot(pet.x - bx, pet.y - by);

      if (dist < FLEE_RADIUS) {
        triggerFlee(pet.x, pet.y);
      }
    }

    function tick() {
      var inFlight = isScrolling || isFleeing;
      var lerp = inFlight ? LERP_FLY : LERP_LAND;
      var prev = currentY;
      currentY += (targetY - currentY) * lerp;
      velocity = currentY - prev;

      var bank = inFlight ? Math.max(-12, Math.min(12, velocity * 2.2)) : 0;

      bird.style.transform =
        'translate3d(0, ' +
        currentY.toFixed(2) +
        'px, 0) scaleX(-1) rotate(' +
        bank.toFixed(2) +
        'deg)';

      if (inFlight) {
        var now = Date.now();
        if (now - lastEmberAt > EMBER_INTERVAL_MS) {
          lastEmberAt = now;
          spawnEmber(bird.getBoundingClientRect());
        }
      }

      var perfNow = performance.now();
      if (perfNow - lastFleeCheckAt > FLEE_CHECK_MS) {
        lastFleeCheckAt = perfNow;
        checkFlee(perfNow);
      }

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
      spawnEmberBurst(bird.getBoundingClientRect(), 5);

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