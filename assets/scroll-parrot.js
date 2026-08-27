/**
 * PETLIO — SCROLL PARROT
 * ============================================================
 * A colorful macaw on the left edge of the page. Left-edge companion to
 * scroll-bird.js (the phoenix on the right) — same scroll-driven flying
 * engine, mirrored, in place of the previous ground-trotting cat (a
 * bird makes more sense in the air than running along a vertical edge).
 *
 * - Flies (wing flap + vertical travel) while the user scrolls, trailing
 *   loose rainbow feathers behind it
 * - When scrolling stops, lands on a perch line of the current section
 *   with a small flourish of feathers
 * - Always faces right (toward page content) -- drawn that way natively,
 *   no mirroring needed
 * - If the dog cursor gets close while it's perched, it startles and
 *   bolts to a different spot, same mechanic as the phoenix/cat before it
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
  var PARROT_HEIGHT = 52;
  var BRANCH_HEIGHT = 28;
  var PERCH_OFFSET_Y = 0.16;
  var FEATHER_INTERVAL_MS = 75;
  var FLEE_RADIUS = 150;
  var FLEE_CHECK_MS = 120;
  var FLEE_COOLDOWN_MS = 1700;
  var STARTLE_MS = 180;
  var MIN_FLEE_DISTANCE = 160;

  var FEATHER_COLORS = [
    'linear-gradient(135deg, #ff5a5f 0%, #e63946 100%)',
    'linear-gradient(135deg, #4fd1c5 0%, #2ec4b6 100%)',
    'linear-gradient(135deg, #ffd166 0%, #f4a72b 100%)',
    'linear-gradient(135deg, #5aa9e6 0%, #2e6fb6 100%)',
    'linear-gradient(135deg, #8fd14f 0%, #5aa63c 100%)'
  ];

  var PARROT_SVG =
    '<svg viewBox="0 0 130 66" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="parrotBody" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#5abf6b"/>' +
    '<stop offset="55%" stop-color="#2f9e52"/>' +
    '<stop offset="100%" stop-color="#1f7a3d"/>' +
    '</linearGradient>' +
    '<linearGradient id="parrotHead" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#5cc9e0"/>' +
    '<stop offset="100%" stop-color="#2f9fb8"/>' +
    '</linearGradient>' +
    '<linearGradient id="parrotTailRed" x1="0" y1="0" x2="1" y2="0.3">' +
    '<stop offset="0%" stop-color="#ff7a63"/>' +
    '<stop offset="100%" stop-color="#e63946"/>' +
    '</linearGradient>' +
    '<linearGradient id="parrotTailBlue" x1="0" y1="0" x2="1" y2="0.3">' +
    '<stop offset="0%" stop-color="#6ab6f0"/>' +
    '<stop offset="100%" stop-color="#2e6fb6"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<ellipse cx="58" cy="52" rx="14" ry="3" fill="rgba(20,60,40,0.12)"/>' +
    '<g class="scroll-parrot__tail">' +
    '<path d="M32 40C18 42 6 48 2 58C10 54 20 48 30 44Z" fill="url(#parrotTailBlue)"/>' +
    '<path d="M34 38C22 38 10 42 4 50C13 48 23 44 32 42Z" fill="url(#parrotTailRed)"/>' +
    '<path d="M35 36C25 34 15 36 9 42C17 42 26 40 34 39Z" fill="#ffd166" opacity="0.9"/>' +
    '</g>' +
    '<g class="scroll-parrot__body">' +
    '<ellipse cx="58" cy="36" rx="23" ry="14" fill="url(#parrotBody)"/>' +
    '<ellipse cx="55" cy="43" rx="14" ry="7" fill="#ffd166" opacity="0.85"/>' +
    '<path d="M46 27C50 25 54 25 58 27" stroke="#1f7a3d" stroke-width="1.6" fill="none" opacity="0.4" stroke-linecap="round"/>' +
    '<circle cx="90" cy="24" r="13" fill="url(#parrotHead)"/>' +
    '<circle cx="88" cy="20" r="6.5" fill="#f4f8f5" opacity="0.9"/>' +
    '<circle cx="88" cy="20" r="2.6" fill="#22303a"/>' +
    '<circle cx="88.8" cy="19" r="0.7" fill="#fff"/>' +
    '<path d="M98 22C104 21 110 24 112 29C107 30 101 30 97 27Z" fill="#3a3a3a"/>' +
    '<path d="M98 22C102 22 106 24 108 27" stroke="#1a1a1a" stroke-width="0.8" fill="none" opacity="0.5"/>' +
    '<path d="M78 15C80 11 84 9 88 10" stroke="#217a8c" stroke-width="1.4" fill="none" opacity="0.5" stroke-linecap="round"/>' +
    '</g>' +
    '<g class="scroll-parrot__wing">' +
    '<path d="M50 32C40 20 34 8 42 4C50 0 60 10 64 22C66 28 60 32 50 32Z" fill="#2e6fb6"/>' +
    '<path d="M50 30C42 20 38 10 44 7C50 4 58 13 61 23C62 27 57 30 50 30Z" fill="#5aa9e6"/>' +
    '<path d="M50 27C44 19 41 12 46 10C51 8 57 15 59 22C60 25 55 27 50 27Z" fill="#ffd166"/>' +
    '<path d="M50 24C46 18 44 13 48 12C52 11 56 16 57 21C58 23 54 24 50 24Z" fill="#5abf6b"/>' +
    '</g>' +
    '</svg>';

  // Thick end at LEFT (matches this file's native right-facing
  // orientation, no mirroring needed), tapering to a thin tip on the
  // right, so the thick end lands against the screen's left edge.
  var BRANCH_SVG =
    '<svg viewBox="0 0 90 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<path d="M0 15C16 11 30 17 46 13C60 10 74 8 90 4" stroke="#8a6240" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M0 15C16 11 30 17 46 13C60 10 74 8 90 4" stroke="#a8794f" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>' +
    '<path d="M42 14C46 9 51 5 58 3" stroke="#7a5636" stroke-width="3.5" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="20" cy="9" rx="7" ry="3.4" fill="#5f8f56" transform="rotate(-18 20 9)"/>' +
    '<ellipse cx="33" cy="18" rx="6" ry="3" fill="#6f9c5f" transform="rotate(14 33 18)"/>' +
    '<ellipse cx="58" cy="1" rx="6.5" ry="3" fill="#5f8f56" transform="rotate(-30 58 1)"/>' +
    '<ellipse cx="70" cy="6" rx="5.5" ry="2.6" fill="#6f9c5f" transform="rotate(-8 70 6)"/>' +
    '</svg>';

  function mount() {
    if (document.getElementById('scroll-parrot')) return;

    var root = document.createElement('div');
    root.id = 'scroll-parrot-root';

    var parrot = document.createElement('div');
    parrot.id = 'scroll-parrot';
    parrot.setAttribute('aria-hidden', 'true');
    parrot.innerHTML = PARROT_SVG;

    root.appendChild(parrot);
    document.body.appendChild(root);

    var branch = document.createElement('div');
    branch.id = 'scroll-parrot-branch';
    branch.setAttribute('aria-hidden', 'true');
    branch.innerHTML = BRANCH_SVG;
    document.body.appendChild(branch);

    var feathers = document.createElement('div');
    feathers.id = 'scroll-parrot-feathers';
    feathers.setAttribute('aria-hidden', 'true');
    document.body.appendChild(feathers);

    start(parrot, branch, feathers);
  }

  function start(parrot, branch, featherContainer) {
    var targetY = window.innerHeight * 0.32;
    var currentY = targetY;
    var velocity = 0;
    var lastScrollY = window.scrollY || window.pageYOffset;
    var isScrolling = false;
    var isFleeing = false;
    var idleTimer = null;
    var perches = [];
    var lastFeatherAt = 0;
    var lastFleeCheckAt = 0;
    var lastFleeAt = -Infinity;

    function spawnFeather(rect, opts) {
      if (!rect || !rect.width) return;
      opts = opts || {};

      var feather = document.createElement('span');
      feather.className = 'scroll-parrot__feather';

      var w = 4 + Math.random() * 3;
      var h = 8 + Math.random() * 6;
      feather.style.width = w.toFixed(1) + 'px';
      feather.style.height = h.toFixed(1) + 'px';

      // Trail off the visual-left side of the bounding box (tail side --
      // the parrot is drawn facing right, unmirrored).
      var baseX = opts.x !== undefined ? opts.x : rect.left + 6;
      var baseY =
        opts.y !== undefined ? opts.y : rect.top + rect.height * 0.62;
      var x = baseX + (Math.random() * 8 - 4);
      var y = baseY + (Math.random() * 8 - 4);

      feather.style.left = x.toFixed(1) + 'px';
      feather.style.top = y.toFixed(1) + 'px';

      var dx = (Math.random() * 18 - 20).toFixed(1) + 'px';
      var dy = (14 + Math.random() * 20).toFixed(1) + 'px';
      var duration = Math.round(600 + Math.random() * 500) + 'ms';
      var rotFrom = Math.round(Math.random() * 40 - 20) + 'deg';
      var rotTo = Math.round(90 + Math.random() * 90) + 'deg';

      feather.style.setProperty('--feather-dx', dx);
      feather.style.setProperty('--feather-dy', dy);
      feather.style.setProperty('--feather-duration', duration);
      feather.style.setProperty('--feather-rot-from', rotFrom);
      feather.style.setProperty('--feather-rot-to', rotTo);
      feather.style.background =
        FEATHER_COLORS[(Math.random() * FEATHER_COLORS.length) | 0];

      featherContainer.appendChild(feather);
      feather.addEventListener(
        'animationend',
        function () {
          if (feather.parentNode) feather.parentNode.removeChild(feather);
        },
        { once: true }
      );
    }

    function spawnFeatherBurst(rect, count) {
      for (var i = 0; i < count; i++) {
        spawnFeather(rect);
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

        var perch = section.querySelector('.scroll-parrot-perch');
        if (!perch) {
          perch = document.createElement('div');
          perch.className = 'scroll-parrot-perch';
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
          best = perchViewportY - PARROT_HEIGHT * 0.55;
        }
      });

      if (best !== null) {
        return Math.max(20, Math.min(vh - PARROT_HEIGHT - 16, best));
      }
      return vh * 0.32;
    }

    function clampToViewport(y, vh) {
      return Math.max(20, Math.min(vh - PARROT_HEIGHT - 16, y));
    }

    // Same perch list, but picks whichever visible perch is FARTHEST
    // from the danger point -- used when fleeing. Always also considers
    // a guaranteed-far fallback (flip to the opposite half of the
    // viewport), since near the top/bottom of the page often only one
    // section is in view, where "farthest visible perch" would just be
    // the parrot's own perch.
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
          bestPerch = clampToViewport(perchViewportY - PARROT_HEIGHT * 0.55, vh);
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
      parrot.classList.remove(
        'is-flying',
        'is-landing',
        'is-perched',
        'is-startled'
      );
      branch.classList.remove(
        'is-flying',
        'is-landing',
        'is-perched',
        'is-startled'
      );
      if (state) {
        parrot.classList.add(state);
        branch.classList.add(state);
      }
    }

    // The dog got close while the parrot was perched -- flinch, then
    // bolt to the farthest visible perch from the danger point.
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
          spawnFeatherBurst(parrot.getBoundingClientRect(), 4);

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

      var rect = parrot.getBoundingClientRect();
      if (!rect.width) return;

      var px = rect.left + rect.width / 2;
      var py = rect.top + rect.height / 2;
      var dist = Math.hypot(pet.x - px, pet.y - py);

      if (dist < FLEE_RADIUS) {
        triggerFlee(pet.x, pet.y);
      }
    }

    function tick() {
      if (window.PetlioFooterYardActive) {
        requestAnimationFrame(tick);
        return;
      }

      var inFlight = isScrolling || isFleeing;
      var lerp = inFlight ? LERP_FLY : LERP_LAND;
      var prev = currentY;
      currentY += (targetY - currentY) * lerp;
      velocity = currentY - prev;

      var bank = inFlight ? Math.max(-12, Math.min(12, velocity * 2.2)) : 0;

      parrot.style.transform =
        'translate3d(0, ' +
        currentY.toFixed(2) +
        'px, 0) rotate(' +
        bank.toFixed(2) +
        'deg)';

      // Branch tracks the same Y, offset down to the parrot's feet
      // rather than its center. No mirroring needed here.
      var branchY = currentY + PARROT_HEIGHT * 0.9 - BRANCH_HEIGHT * 0.3;
      branch.style.transform = 'translate3d(0, ' + branchY.toFixed(2) + 'px, 0)';

      if (inFlight) {
        var now = Date.now();
        if (now - lastFeatherAt > FEATHER_INTERVAL_MS) {
          lastFeatherAt = now;
          spawnFeather(parrot.getBoundingClientRect());
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

      var base = window.innerHeight * (0.16 + progress * 0.6);
      targetY = base + Math.max(-50, Math.min(50, delta * 0.5));
      targetY = Math.max(
        20,
        Math.min(window.innerHeight - PARROT_HEIGHT - 20, targetY)
      );

      clearTimeout(idleTimer);
      idleTimer = setTimeout(onIdle, IDLE_MS);
    }

    function onIdle() {
      isScrolling = false;
      setState('is-landing');
      spawnFeatherBurst(parrot.getBoundingClientRect(), 3);

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
    parrot.style.transform = 'translate3d(0, ' + currentY + 'px, 0)';
    branch.style.transform =
      'translate3d(0, ' +
      (currentY + PARROT_HEIGHT * 0.9 - BRANCH_HEIGHT * 0.3) +
      'px, 0)';
    setState('is-perched');

    requestAnimationFrame(function () {
      parrot.classList.add('is-ready');
      branch.classList.add('is-ready');
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