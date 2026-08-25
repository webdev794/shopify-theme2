/**
 * PETLIO — SCROLL CAT
 * ============================================================
 * An orange tabby on the left edge of the page. Companion to
 * scroll-bird.js — same scroll-driven approach, mirrored to the left,
 * running/sitting instead of flying/landing.
 *
 * - Trots (leg cycle + tail swish) while the user scrolls
 * - When scrolling stops, sits on a perch line of the current section
 * - If the dog cursor gets close while it's sitting, it startles
 *   (ears back, tail puffs) and bolts to a different spot — clears the
 *   spot for reading, and a cat fleeing a dog needs no explanation
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
  var LERP_RUN = 0.22;
  var LERP_LAND = 0.16;
  var CAT_HEIGHT = 46;
  var PERCH_OFFSET_Y = 0.16;
  var FLEE_RADIUS = 150;
  var FLEE_CHECK_MS = 120;
  var FLEE_COOLDOWN_MS = 1700;
  var STARTLE_MS = 180;
  var MIN_FLEE_DISTANCE = 160;

  var CAT_SVG =
    '<svg viewBox="0 0 130 58" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="catFur" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#d97b3a"/>' +
    '<stop offset="45%" stop-color="#eb9c55"/>' +
    '<stop offset="100%" stop-color="#f8dfc0"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<ellipse class="scroll-cat__shadow" cx="58" cy="53" rx="26" ry="4" fill="rgba(60,40,10,0.14)"/>' +
    '<g class="scroll-cat__tail">' +
    '<path d="M28 40C16 44 6 40 4 30C10 34 18 38 24 34C20 28 17 23 21 17C26 22 29 32 28 40Z" fill="url(#catFur)"/>' +
    '<path d="M12 33C10 29 10 25 13 22" stroke="#c56a2c" stroke-width="1.3" fill="none" opacity="0.55" stroke-linecap="round"/>' +
    '</g>' +
    '<g class="scroll-cat__legs-back">' +
    '<path d="M32 44C30 44 29 48 30 54L35 54C36 48 35 44 33 44Z" fill="#c56a2c"/>' +
    '<path d="M38 44C36 44 35 48 36 54L41 54C42 48 41 44 39 44Z" fill="#e08c46"/>' +
    '</g>' +
    '<g class="scroll-cat__body">' +
    '<ellipse cx="54" cy="36" rx="24" ry="14" fill="url(#catFur)"/>' +
    '<ellipse cx="50" cy="44" rx="16" ry="8" fill="#faeccb" opacity="0.6"/>' +
    '<path d="M44 27C48 25 52 25 56 27" stroke="#c56a2c" stroke-width="2" fill="none" opacity="0.45" stroke-linecap="round"/>' +
    '<path d="M40 33C44 31.5 48 31.5 52 33" stroke="#c56a2c" stroke-width="2" fill="none" opacity="0.35" stroke-linecap="round"/>' +
    '</g>' +
    '<g class="scroll-cat__legs-front">' +
    '<path d="M66 42C64 42 63 46 64 54L69 54C70 46 69 42 67 42Z" fill="#c56a2c"/>' +
    '<path d="M74 42C72 42 71 46 72 54L77 54C78 46 77 42 75 42Z" fill="#e08c46"/>' +
    '</g>' +
    '<g class="scroll-cat__head">' +
    '<g class="scroll-cat__ears">' +
    '<path d="M80 15L74 3L88 12Z" fill="url(#catFur)"/>' +
    '<path d="M80 13L76 6L85 12Z" fill="#f6c2c2"/>' +
    '<path d="M100 15L106 3L92 12Z" fill="url(#catFur)"/>' +
    '<path d="M100 13L104 6L95 12Z" fill="#f6c2c2"/>' +
    '</g>' +
    '<circle cx="90" cy="24" r="12" fill="url(#catFur)"/>' +
    '<path d="M85 13C87 11 91 11 93 13" stroke="#c56a2c" stroke-width="1.2" fill="none" opacity="0.6" stroke-linecap="round"/>' +
    '<path d="M84 29C92 28 102 27 108 30C102 34 92 36 86 35Z" fill="#f3e6cf"/>' +
    '<ellipse cx="106" cy="30" rx="2" ry="1.6" fill="#e8879a"/>' +
    '<path d="M86 30L72 27M86 32L71 32M86 34L72 37" stroke="#fff" stroke-width="0.6" opacity="0.75" stroke-linecap="round"/>' +
    '<ellipse cx="94" cy="21" rx="2.6" ry="2.2" fill="#c98a35"/>' +
    '<ellipse cx="94" cy="21" rx="0.6" ry="1.8" fill="#1a1a1a"/>' +
    '<circle cx="94.6" cy="20" r="0.5" fill="#fff6df"/>' +
    '<path d="M88 35C91 37 95 37 98 35" stroke="#5c3a1c" stroke-width="1" fill="none" stroke-linecap="round"/>' +
    '</g>' +
    '</svg>';

  function mount() {
    if (document.getElementById('scroll-cat')) return;

    var root = document.createElement('div');
    root.id = 'scroll-cat-root';

    var cat = document.createElement('div');
    cat.id = 'scroll-cat';
    cat.setAttribute('aria-hidden', 'true');
    cat.innerHTML = CAT_SVG;

    root.appendChild(cat);
    document.body.appendChild(root);

    start(cat);
  }

  function start(cat) {
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

        var perch = section.querySelector('.scroll-cat-perch');
        if (!perch) {
          perch = document.createElement('div');
          perch.className = 'scroll-cat-perch';
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
          best = perchViewportY - CAT_HEIGHT * 0.55;
        }
      });

      if (best !== null) {
        return Math.max(20, Math.min(vh - CAT_HEIGHT - 16, best));
      }
      return vh * 0.32;
    }

    function clampToViewport(y, vh) {
      return Math.max(20, Math.min(vh - CAT_HEIGHT - 16, y));
    }

    // Same perch list, but picks whichever visible perch is FARTHEST
    // from the danger point — used when fleeing. Always also considers
    // a guaranteed-far fallback (flip to the opposite half of the
    // viewport), since near the top/bottom of the page often only one
    // section is in view, where "farthest visible perch" would just be
    // the cat's own perch.
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
          bestPerch = clampToViewport(perchViewportY - CAT_HEIGHT * 0.55, vh);
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
      cat.classList.remove(
        'is-running',
        'is-landing',
        'is-sitting',
        'is-startled'
      );
      if (state) cat.classList.add(state);
    }

    // The dog got close while the cat was sitting still — flinch (ears
    // back, tail puffs), then bolt to the farthest visible perch from
    // the danger point.
    function triggerFlee(dangerX, dangerY) {
      lastFleeAt = performance.now();
      setState('is-startled');

      setTimeout(function () {
        if (isScrolling) return;

        isFleeing = true;
        setState('is-running');
        targetY = getFleeTargetY(dangerY, currentY);

        setTimeout(function () {
          isFleeing = false;
          if (isScrolling) return;

          setState('is-landing');

          setTimeout(function () {
            if (!isScrolling) setState('is-sitting');
          }, 400);
        }, 550);
      }, STARTLE_MS);
    }

    function checkFlee(now) {
      if (isScrolling || isFleeing) return;
      if (now - lastFleeAt < FLEE_COOLDOWN_MS) return;

      var pet = window.PetlioCursorPet;
      if (!pet || typeof pet.x !== 'number' || pet.x < -1000) return;

      var rect = cat.getBoundingClientRect();
      if (!rect.width) return;

      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dist = Math.hypot(pet.x - cx, pet.y - cy);

      if (dist < FLEE_RADIUS) {
        triggerFlee(pet.x, pet.y);
      }
    }

    function tick() {
      var lerp = isScrolling ? LERP_RUN : LERP_LAND;
      var prev = currentY;
      currentY += (targetY - currentY) * lerp;
      velocity = currentY - prev;

      var inMotion = isScrolling || isFleeing;
      var bank = inMotion ? Math.max(-9, Math.min(9, velocity * 2)) : 0;

      cat.style.transform =
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
        setState('is-running');
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
        Math.min(window.innerHeight - CAT_HEIGHT - 20, targetY)
      );

      clearTimeout(idleTimer);
      idleTimer = setTimeout(onIdle, IDLE_MS);
    }

    function onIdle() {
      isScrolling = false;
      setState('is-landing');

      setTimeout(function () {
        if (!isScrolling) setState('is-sitting');
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
    cat.style.transform = 'translate3d(0, ' + currentY + 'px, 0)';
    setState('is-sitting');

    requestAnimationFrame(function () {
      cat.classList.add('is-ready');
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