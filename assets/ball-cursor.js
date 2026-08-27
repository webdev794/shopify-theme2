/**
 * PETLIO — BALL CURSOR
 * ============================================================
 * Replaces the old illustrated dog cursor with a simple rolling
 * ball that follows the pointer. Two reasons for the swap:
 *
 * - Thematic: the footer yard's dog now plays fetch with an actual
 *   ball -- having the cursor itself be a ball elsewhere on the
 *   site reads as "the same ball you've been carrying around,"
 *   rather than a different dog quietly taking over at the footer.
 * - Weight: no leg-cycle/tail-wag/sniff/sit/bite state machine --
 *   just position, a rolling rotation, and a small idle wobble.
 *
 * Still sets window.PetlioCursorPet = {x, y} every frame, the same
 * contract the old dog cursor provided. scroll-cat.js and
 * scroll-bird.js's site-wide flee-from-cursor logic needed zero
 * changes to keep working against this.
 *
 * Respects prefers-reduced-motion and coarse pointers (never
 * mounts at all -- real cursor stays untouched). Self-pauses its
 * animation loop after a period of no pointer movement, resuming
 * instantly on the next move, same convention as the file it
 * replaces.
 */

(function () {
  'use strict';

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var coarsePointer =
    window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  if (reduceMotion || coarsePointer) {
    return;
  }

  var LERP = 0.2;
  var IDLE_MS = 260;
  var LOOP_PAUSE_AFTER_MS = 1800;
  var BALL_RADIUS = 15;
  var HOVER_CHECK_MS = 80;
  var INTERACTIVE_SELECTOR =
    'a, button, [role="button"], input, select, textarea, .product-card, .collection-card, .card, [data-cursor-interaction]';

  // The yard scenes' own draggable/throwable ball -- detected purely by
  // reading the DOM at press time (elementFromPoint), same technique
  // already used below for hover detection. This never touches
  // footer-yard.js/.css or hero-yard.js/.css; it only looks at them.
  var YARD_BALL_SELECTOR = '.footer-yard__ball, .hero-yard__ball';

  var BALL_SVG =
    '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><radialGradient id="ballShadeCursor" cx="35%" cy="30%" r="75%">' +
    '<stop offset="0%" stop-color="#fff3d6"/><stop offset="55%" stop-color="#ffb64d"/>' +
    '<stop offset="100%" stop-color="#e07a2c"/></radialGradient></defs>' +
    '<circle cx="15" cy="15" r="13" fill="url(#ballShadeCursor)"/>' +
    '<path d="M3 15C8 10 22 10 27 15" stroke="#c8571f" stroke-width="2" fill="none" opacity="0.55"/>' +
    '<path d="M3 15C8 20 22 20 27 15" stroke="#c8571f" stroke-width="2" fill="none" opacity="0.4"/>' +
    '<ellipse cx="11" cy="10" rx="4" ry="2.4" fill="#fff6e0" opacity="0.55"/>' +
    '</svg>';

  // Shown in place of the ball while actively holding the yard's ball,
  // so the two objects never visually compete for "which one is mine."
  var HAND_SVG =
    '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="handShadeCursor" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#ffdcb0"/><stop offset="100%" stop-color="#e8a463"/>' +
    '</linearGradient></defs>' +
    '<path d="M10 26C7 26 5 23 5 19L5 14C5 12.6 6.1 11.5 7.5 11.5C8.9 11.5 10 12.6 10 14L10 17" ' +
    'fill="url(#handShadeCursor)" stroke="#c8874a" stroke-width="1" stroke-linejoin="round"/>' +
    '<path d="M10 17L10 10C10 8.6 11.1 7.5 12.5 7.5C13.9 7.5 15 8.6 15 10L15 17" ' +
    'fill="url(#handShadeCursor)" stroke="#c8874a" stroke-width="1" stroke-linejoin="round"/>' +
    '<path d="M15 17L15 9C15 7.6 16.1 6.5 17.5 6.5C18.9 6.5 20 7.6 20 9L20 17" ' +
    'fill="url(#handShadeCursor)" stroke="#c8874a" stroke-width="1" stroke-linejoin="round"/>' +
    '<path d="M20 17L20 11C20 9.6 21.1 8.5 22.5 8.5C23.9 8.5 25 9.6 25 11L25 20C25 24 22 27 18 27L14 27C11.5 27 10 25.5 8 23" ' +
    'fill="url(#handShadeCursor)" stroke="#c8874a" stroke-width="1" stroke-linejoin="round"/>' +
    '</svg>';

  function mount() {
    if (document.getElementById('ball-cursor-ball')) return;

    var ball = document.createElement('div');
    ball.id = 'ball-cursor-ball';
    ball.setAttribute('aria-hidden', 'true');
    ball.innerHTML =
      '<div class="ball-cursor__inner">' +
      BALL_SVG +
      '</div>' +
      '<div class="ball-cursor__hand">' +
      HAND_SVG +
      '</div>';
    document.body.appendChild(ball);

    start(ball);
  }

  function start(ball) {
    var targetX = -9999;
    var targetY = -9999;
    var currentX = targetX;
    var currentY = targetY;
    var rotation = 0;
    var lastMoveAt = performance.now();
    var active = false;
    var rafId = 0;
    var idleTimer = null;
    var hasMoved = false;
    var lastHoverCheckAt = 0;
    var isHoveringInteractive = false;
    var isHoldingYardBall = false;
    var releasedTimer = null;

    window.PetlioCursorPet = window.PetlioCursorPet || {};
    window.PetlioCursorPet.x = -9999;
    window.PetlioCursorPet.y = -9999;

    function onMove(e) {
      var prevX = targetX;
      targetX = e.clientX;
      targetY = e.clientY;
      lastMoveAt = performance.now();

      if (!hasMoved) {
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        document.body.classList.add('ball-cursor-active');
      }

      ball.classList.remove('is-idle');
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        ball.classList.add('is-idle');
      }, IDLE_MS);

      startLoop();
    }

    function onDown(e) {
      ball.classList.add('is-pressed');

      // Was the press specifically on the yard's own ball (the one pets
      // fetch/play with), not just any mousedown on the page? Checked by
      // reading the DOM at the press point -- doesn't require the yard
      // scripts to announce anything.
      var pressEl = document.elementFromPoint(e.clientX, e.clientY);
      if (pressEl && pressEl.closest(YARD_BALL_SELECTOR)) {
        isHoldingYardBall = true;
        ball.classList.add('is-holding');
      }
    }

    function onUp() {
      ball.classList.remove('is-pressed');

      if (isHoldingYardBall) {
        isHoldingYardBall = false;
        ball.classList.remove('is-holding');
        // A quick pulse on release so it's clear the hand let go and
        // the ball is now its own separate, thrown object.
        ball.classList.add('is-released');
        clearTimeout(releasedTimer);
        releasedTimer = setTimeout(function () {
          ball.classList.remove('is-released');
        }, 260);
      }
    }

    function tick() {
      if (!active) return;

      var dx = targetX - currentX;
      var dy = targetY - currentY;
      currentX += dx * LERP;
      currentY += dy * LERP;
      rotation += dx * LERP * 0.6; // rolls in the direction of travel

      ball.style.transform =
        'translate3d(' +
        (currentX - BALL_RADIUS).toFixed(1) +
        'px,' +
        (currentY - BALL_RADIUS).toFixed(1) +
        'px,0) rotate(' +
        (rotation % 360).toFixed(1) +
        'deg)';

      window.PetlioCursorPet.x = currentX;
      window.PetlioCursorPet.y = currentY;

      var now = performance.now();
      if (now - lastHoverCheckAt > HOVER_CHECK_MS) {
        lastHoverCheckAt = now;
        var el =
          targetX >= 0 && targetY >= 0
            ? document.elementFromPoint(targetX, targetY)
            : null;
        var nextHover = !!(el && el.closest(INTERACTIVE_SELECTOR));
        if (nextHover !== isHoveringInteractive) {
          isHoveringInteractive = nextHover;
          ball.classList.toggle('is-hover', isHoveringInteractive);
        }
      }

      if (performance.now() - lastMoveAt > LOOP_PAUSE_AFTER_MS) {
        active = false;
        return;
      }

      rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (active) return;
      active = true;
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();