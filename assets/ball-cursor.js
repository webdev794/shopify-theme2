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

  function mount() {
    if (document.getElementById('ball-cursor-ball')) return;

    var ball = document.createElement('div');
    ball.id = 'ball-cursor-ball';
    ball.setAttribute('aria-hidden', 'true');
    ball.innerHTML = '<div class="ball-cursor__inner">' + BALL_SVG + '</div>';
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

    function onDown() {
      ball.classList.add('is-pressed');
    }
    function onUp() {
      ball.classList.remove('is-pressed');
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