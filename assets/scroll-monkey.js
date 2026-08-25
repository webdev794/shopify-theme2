/**
 * PETLIO — SCROLL MONKEY
 * ============================================================
 * A monkey on the left edge of the page. Companion to scroll-bird.js —
 * same scroll-driven approach, mirrored to the left, swinging/hanging
 * instead of flying/landing.
 *
 * - Swings hand-over-hand while the user scrolls
 * - When scrolling stops, hangs from a perch line of the current section
 * - If the dog cursor gets close while it's hanging, it startles and
 *   swings off to the farthest visible perch — clears the spot for
 *   reading and adds a bit of interaction between the two creatures
 * - Always faces right (toward page content)
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
  var LERP_SWING = 0.22;
  var LERP_LAND = 0.16;
  var MONKEY_HEIGHT = 60;
  var PERCH_OFFSET_Y = 0.16;
  var GRIP_RATIO = 0.1; // hands sit ~10% down from the top of the artwork
  var FLEE_RADIUS = 150;
  var FLEE_CHECK_MS = 120;
  var FLEE_COOLDOWN_MS = 1700;
  var STARTLE_MS = 180;

  var MONKEY_SVG =
    '<svg viewBox="0 0 56 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="monkeyFur" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#6b4a2f"/>' +
    '<stop offset="55%" stop-color="#8a6440"/>' +
    '<stop offset="100%" stop-color="#a9805a"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<g class="scroll-monkey__tail">' +
    '<path d="M16 40C6 44 4 34 10 26C14 30 14 36 18 38C22 34 24 28 22 22C26 26 28 34 24 40C21 44.5 18.5 43 16 40Z" fill="url(#monkeyFur)"/>' +
    '</g>' +
    '<g class="scroll-monkey__arm-a">' +
    '<path d="M20 26C14 20 12 12 18 6C20 10 22 16 24 24Z" fill="#7a5738"/>' +
    '<circle cx="18" cy="6" r="2.4" fill="#5c4128"/>' +
    '</g>' +
    '<g class="scroll-monkey__arm-b">' +
    '<path d="M32 26C38 20 40 12 34 6C32 10 30 16 28 24Z" fill="#8a6440"/>' +
    '<circle cx="34" cy="6" r="2.4" fill="#5c4128"/>' +
    '</g>' +
    '<g class="scroll-monkey__body">' +
    '<ellipse cx="26" cy="34" rx="11" ry="14" fill="url(#monkeyFur)"/>' +
    '<ellipse cx="26" cy="38" rx="6" ry="8" fill="#f0dcc0" opacity="0.85"/>' +
    '<path d="M20 46C18 46 17 50 18 56L23 56C24 50 23 46 21 46Z" fill="#6b4a2f"/>' +
    '<path d="M30 46C28 46 27 50 28 56L33 56C34 50 33 46 31 46Z" fill="#7a5738"/>' +
    '<circle cx="19" cy="14" r="3" fill="#8a6440"/>' +
    '<circle cx="19" cy="14" r="1.6" fill="#e8cba3"/>' +
    '<circle cx="37" cy="14" r="3" fill="#8a6440"/>' +
    '<circle cx="37" cy="14" r="1.6" fill="#e8cba3"/>' +
    '<circle cx="28" cy="16" r="9" fill="url(#monkeyFur)"/>' +
    '<ellipse cx="28" cy="18" rx="6" ry="6.5" fill="#f0dcc0"/>' +
    '<circle cx="25" cy="16" r="1.8" fill="#241408"/>' +
    '<circle cx="25.5" cy="15.3" r="0.5" fill="#fff6df"/>' +
    '<circle cx="31" cy="16" r="1.8" fill="#241408"/>' +
    '<circle cx="31.5" cy="15.3" r="0.5" fill="#fff6df"/>' +
    '<ellipse cx="28" cy="20" rx="1.6" ry="1.1" fill="#4a2f1c"/>' +
    '<path d="M25 22.5C26.5 24 29.5 24 31 22.5" stroke="#4a2f1c" stroke-width="0.9" fill="none" stroke-linecap="round"/>' +
    '</g>' +
    '</svg>';

  function mount() {
    if (document.getElementById('scroll-monkey')) return;

    var root = document.createElement('div');
    root.id = 'scroll-monkey-root';

    var monkey = document.createElement('div');
    monkey.id = 'scroll-monkey';
    monkey.setAttribute('aria-hidden', 'true');
    monkey.innerHTML = MONKEY_SVG;

    root.appendChild(monkey);
    document.body.appendChild(root);

    start(monkey);
  }

  function start(monkey) {
    var targetY = window.innerHeight * 0.32;
    var currentY = targetY;
    var velocity = 0;
    var lastScrollY = window.scrollY || window.pageYOffset;
    var isScrolling = false;
    var isFleeing = false;
    var idleTimer = null;
    var perches = [];
    var lastFleeCheckAt = 0;
    var lastFleeAt = -Infinity;

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

        var perch = section.querySelector('.scroll-monkey-perch');
        if (!perch) {
          perch = document.createElement('div');
          perch.className = 'scroll-monkey-perch';
          perch.setAttribute('aria-hidden', 'true');
          section.appendChild(perch);
        }
        perches.push({ section: section, perch: perch });
      });
    }

    function getActivePerchY() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var probe = vh * 0.42;
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
          best = perchViewportY - MONKEY_HEIGHT * GRIP_RATIO;
        }
      });

      if (best !== null) {
        return Math.max(20, Math.min(vh - MONKEY_HEIGHT - 16, best));
      }
      return vh * 0.32;
    }

    // Same perch list, but picks whichever visible perch is FARTHEST from
    // a given point — used when fleeing.
    //
    // A perch-only pick can fail near the top/bottom of the page, where
    // often only one section is in view: the "farthest visible perch"
    // is then the monkey's own perch, which looked like it never moved.
    // So this always also considers a guaranteed-far fallback (flip to
    // the opposite half of the viewport) and returns whichever of the
    // two actually ends up farther from the danger point.
    var MIN_FLEE_DISTANCE = 160;

    function clampToViewport(y, vh) {
      return Math.max(20, Math.min(vh - MONKEY_HEIGHT - 16, y));
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
            perchViewportY - MONKEY_HEIGHT * GRIP_RATIO,
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
      monkey.classList.remove(
        'is-swinging',
        'is-landing',
        'is-hanging',
        'is-startled'
      );
      if (state) monkey.classList.add(state);
    }

    // The dog got close while the monkey was hanging still — flinch,
    // then swing off to the farthest visible perch from the danger point.
    function triggerFlee(dangerX, dangerY) {
      lastFleeAt = performance.now();
      setState('is-startled');

      setTimeout(function () {
        if (isScrolling) return;

        isFleeing = true;
        setState('is-swinging');
        targetY = getFleeTargetY(dangerY, currentY);

        setTimeout(function () {
          isFleeing = false;
          if (isScrolling) return;

          setState('is-landing');

          setTimeout(function () {
            if (!isScrolling) setState('is-hanging');
          }, 400);
        }, 550);
      }, STARTLE_MS);
    }

    function checkFlee(now) {
      if (isScrolling || isFleeing) return;
      if (now - lastFleeAt < FLEE_COOLDOWN_MS) return;

      var pet = window.PetlioCursorPet;
      if (!pet || typeof pet.x !== 'number' || pet.x < -1000) return;

      var rect = monkey.getBoundingClientRect();
      if (!rect.width) return;

      var mx = rect.left + rect.width / 2;
      var my = rect.top + rect.height / 2;
      var dist = Math.hypot(pet.x - mx, pet.y - my);

      if (dist < FLEE_RADIUS) {
        triggerFlee(pet.x, pet.y);
      }
    }

    function tick() {
      var inMotion = isScrolling || isFleeing;
      var lerp = inMotion ? LERP_SWING : LERP_LAND;
      var prev = currentY;
      currentY += (targetY - currentY) * lerp;
      velocity = currentY - prev;

      var bank = inMotion ? Math.max(-10, Math.min(10, velocity * 2)) : 0;

      monkey.style.transform =
        'translate3d(0, ' +
        currentY.toFixed(2) +
        'px, 0) rotate(' +
        bank.toFixed(2) +
        'deg)';

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
        setState('is-swinging');
      }

      var docH = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      var progress = Math.max(0, Math.min(1, sy / docH));

      var base = window.innerHeight * (0.16 + progress * 0.6);
      targetY = base + Math.max(-50, Math.min(50, delta * 0.5));
      targetY = Math.max(
        20,
        Math.min(window.innerHeight - MONKEY_HEIGHT - 20, targetY)
      );

      clearTimeout(idleTimer);
      idleTimer = setTimeout(onIdle, IDLE_MS);
    }

    function onIdle() {
      isScrolling = false;
      setState('is-landing');

      setTimeout(function () {
        if (!isScrolling) setState('is-hanging');
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
    monkey.style.transform = 'translate3d(0, ' + currentY + 'px, 0)';
    setState('is-hanging');

    requestAnimationFrame(function () {
      monkey.classList.add('is-ready');
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