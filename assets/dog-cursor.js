/**
 * Petlio – Product SVG cursor + single dotted dog
 *
 * - Cursor = product SVG (bone / ball / food bowl)
 * - Exactly ONE dog (black dots) runs smoothly behind the cursor
 * - When cursor stops: sniff → sit → bite/chew/eat
 * - Idle/eat: dog faces TOWARD the cursor (head at the toy, not tail)
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  var TOYS = ['bone', 'ball', 'plate'];
  var TOY_CYCLE_MS = 14000;
  var IDLE_AFTER_MS = 500;
  var DOG_SCALE = 1.12;

  var TOY_SVG = {
    bone:
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path fill="#E8D5B5" stroke="#8B6914" stroke-width="1.5" stroke-linejoin="round" d="M14 28c-4-4-10-3-12 1s1 9 5 10c2.5.6 5-.2 7-2l6 6c-2 2-2.5 4.5-2 7 1 4 6 7 10 5s5-8 1-12l6-6c2 2 4.5 2.5 7 2 4-1 7-6 5-10s-8-4-12 0l-6 6-6-6c-2-2-4.5-2.5-7-2z"/>' +
      '<path fill="#F5E6C8" d="M20 32l12 12 4-4-12-12z" opacity=".5"/>' +
      '</svg>',
    ball:
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<circle cx="32" cy="32" r="22" fill="#F4A261" stroke="#C45C26" stroke-width="1.8"/>' +
      '<path fill="none" stroke="#C45C26" stroke-width="1.6" d="M14 28c6 2 12 2 18 0s12-2 18 0"/>' +
      '<path fill="none" stroke="#C45C26" stroke-width="1.6" d="M14 36c6-2 12-2 18 0s12 2 18 0"/>' +
      '<path fill="none" stroke="#C45C26" stroke-width="1.5" d="M32 12v40"/>' +
      '<circle cx="24" cy="22" r="4" fill="#FFE8D1" opacity=".7"/>' +
      '</svg>',
    plate:
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<ellipse cx="32" cy="38" rx="26" ry="14" fill="#D4D4D8" stroke="#71717A" stroke-width="1.5"/>' +
      '<ellipse cx="32" cy="36" rx="20" ry="10" fill="#A1A1AA"/>' +
      '<ellipse cx="32" cy="34" rx="14" ry="7" fill="#78716C"/>' +
      '<circle cx="28" cy="32" r="2.2" fill="#B45309"/>' +
      '<circle cx="34" cy="33" r="2" fill="#D97706"/>' +
      '<circle cx="31" cy="36" r="1.8" fill="#B45309"/>' +
      '<circle cx="36" cy="30" r="1.6" fill="#F59E0B"/>' +
      '<circle cx="26" cy="35" r="1.5" fill="#D97706"/>' +
      '</svg>'
  };

  // Dog faces +X (to the right) in all frame data. Head is at high X, tail at low X.
  var RUN = [
    [[0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],[56,-6],[62,-10],[66,-8],[68,-4],[64,0],[58,-14],[54,-16],[62,-15],[72,-6],[74,-4],[-8,-6],[-14,-12],[-18,-8],[42,8],[44,16],[46,24],[50,8],[52,14],[54,20],[10,6],[8,14],[6,22],[18,6],[20,14],[22,22]],
    [[0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],[56,-6],[62,-10],[66,-8],[68,-4],[64,0],[58,-14],[54,-16],[62,-15],[72,-6],[74,-4],[-8,-4],[-12,-10],[-16,-6],[42,6],[40,12],[38,18],[50,8],[54,12],[58,16],[10,8],[14,14],[18,18],[18,4],[16,10],[12,16]],
    [[0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],[56,-6],[62,-10],[66,-8],[68,-4],[64,0],[58,-14],[54,-16],[62,-15],[72,-6],[74,-4],[-6,-8],[-12,-14],[-16,-10],[44,6],[48,14],[52,22],[48,8],[46,16],[44,24],[8,4],[4,10],[0,16],[20,8],[24,14],[28,20]],
    [[0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],[56,-6],[62,-10],[66,-8],[68,-4],[64,0],[58,-14],[54,-16],[62,-15],[72,-6],[74,-4],[-10,-5],[-15,-11],[-18,-7],[40,8],[38,14],[36,20],[52,6],[56,12],[60,18],[12,6],[16,12],[20,18],[16,6],[12,12],[8,18]]
  ];

  var SIT = [
    [[0,2],[8,0],[16,0],[24,1],[32,1],[40,0],[48,-2],[54,-6],[60,-10],[64,-8],[66,-4],[62,0],[56,-14],[52,-16],[60,-15],[70,-6],[72,-4],[-6,-2],[-10,-6],[-12,-2],[42,8],[44,14],[46,16],[50,6],[52,10],[10,10],[8,16],[6,18],[18,10],[20,16],[22,18]]
  ];

  var SNIFF = [
    [[0,0],[8,-1],[16,0],[24,1],[32,1],[40,0],[48,-1],[56,-2],[64,-3],[70,-2],[74,0],[70,3],[58,-8],[54,-10],[62,-9],[78,0],[80,2],[-8,-4],[-12,-8],[-16,-4],[42,8],[44,14],[46,18],[50,8],[52,12],[10,8],[8,14],[6,18],[18,8],[20,14],[22,18]],
    [[0,0],[8,-1],[16,0],[24,1],[32,1],[40,0],[48,-1],[56,-3],[64,-4],[70,-3],[74,-1],[70,2],[58,-9],[54,-11],[62,-10],[78,-1],[80,1],[-8,-4],[-12,-8],[-16,-4],[42,8],[44,14],[46,18],[50,8],[52,12],[10,8],[8,14],[6,18],[18,8],[20,14],[22,18]]
  ];

  var BITE = [
    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[54,-2],[60,-4],[64,-2],[66,2],[62,4],[56,-8],[52,-10],[60,-9],[70,0],[72,2],[-8,-4],[-12,-8],[-16,-5],[42,10],[44,16],[46,20],[50,10],[52,14],[10,8],[8,14],[6,18],[18,8],[20,14],[22,18]],
    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[52,0],[58,-1],[62,1],[64,5],[60,7],[54,-5],[50,-7],[58,-6],[68,4],[70,6],[-8,-3],[-11,-6],[-14,-4],[42,10],[44,15],[46,18],[50,10],[52,14],[10,8],[8,13],[6,17],[18,8],[20,13],[22,17]],
    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[54,-3],[60,-5],[64,-2],[66,3],[62,5],[56,-8],[52,-10],[60,-9],[70,1],[72,3],[-8,-4],[-12,-8],[-15,-5],[42,10],[44,15],[46,19],[50,10],[52,14],[10,8],[8,13],[6,17],[18,8],[20,13],[22,17]],
    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[52,-1],[58,-2],[62,0],[64,4],[60,6],[54,-6],[50,-8],[58,-7],[68,3],[70,5],[-8,-3],[-11,-7],[-14,-4],[42,10],[44,15],[46,18],[50,10],[52,14],[10,8],[8,13],[6,17],[18,8],[20,13],[22,17]]
  ];

  function densify(frame) {
    var out = [];
    for (var i = 0; i < frame.length; i++) {
      var x = frame[i][0];
      var y = frame[i][1];
      out.push([x, y]);
      var a = (i * 2.4) % (Math.PI * 2);
      out.push([x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6]);
    }
    return out;
  }

  var FRAMES = {
    run: RUN.map(densify),
    sit: SIT.map(densify),
    sniff: SNIFF.map(densify),
    bite: BITE.map(densify)
  };

  var canvas, ctx, toyEl;
  var mouseX = -9999, mouseY = -9999;
  var dogX = 0, dogY = 0;
  var velX = 0, velY = 0;

  var behindX = -48;
  var behindY = 18;
  var facing = 1; // 1 = head toward +X (right)

  var mode = 'run';
  var frameIndex = 0;
  var frameTimer = 0;
  var lastMoveTime = 0;
  var lastTime = 0;
  var idleTimer = 0;

  var toyIndex = 0;
  var lastToySwitch = 0;

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'dog-cursor-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });

    toyEl = document.createElement('div');
    toyEl.id = 'dog-cursor-toy';
    toyEl.setAttribute('aria-hidden', 'true');
    toyEl.innerHTML = TOY_SVG.bone;
    document.body.appendChild(toyEl);

    document.body.classList.add('dog-cursor-active');
    resize();

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', function () {
      mouseX = -9999;
      mouseY = -9999;
      toyEl.classList.add('is-hidden');
    });
    window.addEventListener('mouseenter', function () {
      toyEl.classList.remove('is-hidden');
    });
    window.addEventListener('mousedown', switchToy, { passive: true });

    dogX = window.innerWidth * 0.35;
    dogY = window.innerHeight * 0.5;
    lastMoveTime = performance.now();
    lastToySwitch = performance.now();
    requestAnimationFrame(loop);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastMoveTime = performance.now();
    toyEl.classList.remove('is-hidden');
    if (mode !== 'run') {
      mode = 'run';
      idleTimer = 0;
      frameIndex = 0;
      frameTimer = 0;
    }
  }

  function switchToy() {
    toyIndex = (toyIndex + 1) % TOYS.length;
    toyEl.innerHTML = TOY_SVG[TOYS[toyIndex]];
    lastToySwitch = performance.now();
  }

  function update(dt, now) {
    if (mouseX < -1000) return;

    if (now - lastToySwitch > TOY_CYCLE_MS) switchToy();

    toyEl.style.transform = 'translate(' + mouseX + 'px,' + mouseY + 'px)';

    var still = (now - lastMoveTime) > IDLE_AFTER_MS;
    if (still && mode === 'run') {
      mode = 'sniff';
      idleTimer = 0;
      frameIndex = 0;
      frameTimer = 0;
    }

    // --- Position target ---
    var desiredBehindX = -48;
    var desiredBehindY = mode === 'sit' ? 26 : 16;

    if (mode === 'run') {
      // While running, lag opposite to movement (smooth, no snap)
      if (Math.abs(velX) > 0.4) {
        desiredBehindX = velX > 0 ? -48 : 48;
      }
      behindX += (desiredBehindX - behindX) * 0.04;
      behindY += (desiredBehindY - behindY) * 0.08;
    } else {
      // Idle / eat: stand slightly to the LEFT of the toy by default,
      // so when facing right the HEAD is toward the cursor.
      // If dog is already on the right, stand to the RIGHT and face left.
      var preferLeft = dogX <= mouseX;
      desiredBehindX = preferLeft ? -40 : 40;
      desiredBehindY = mode === 'sit' ? 22 : 12;
      behindX += (desiredBehindX - behindX) * 0.1;
      behindY += (desiredBehindY - behindY) * 0.12;
    }

    var targetX = mouseX + behindX;
    var targetY = mouseY + behindY;

    // Pull closer when interacting with the toy
    if (mode === 'bite' || mode === 'sniff') {
      targetX = mouseX + behindX * 0.55;
      targetY = mouseY + 8;
    }

    var dx = targetX - dogX;
    var dy = targetY - dogY;
    var stiff = (mode === 'bite' || mode === 'sniff') ? 0.12 : 0.06;
    var damp = 0.78;

    velX += dx * stiff;
    velY += dy * stiff;
    velX *= damp;
    velY *= damp;
    dogX += velX;
    dogY += velY;

    // --- Facing ---
    // Run: face direction of travel
    // Idle/eat: ALWAYS face toward the cursor so head touches the product, not the tail
    if (mode === 'run') {
      if (velX > 0.35) facing += (1 - facing) * 0.12;
      else if (velX < -0.35) facing += (-1 - facing) * 0.12;
    } else {
      // Face the toy: if dog is left of cursor → face right (1); if right → face left (-1)
      var want = dogX < mouseX ? 1 : -1;
      facing += (want - facing) * 0.2;
    }
    if (facing > 0.85) facing = 1;
    if (facing < -0.85) facing = -1;

    // Animation
    if (mode === 'run') {
      var sp = Math.hypot(velX, velY);
      frameTimer += dt * (0.012 + sp * 0.03);
      if (frameTimer > 1) {
        frameTimer = 0;
        frameIndex = (frameIndex + 1) % FRAMES.run.length;
      }
    } else {
      idleTimer += dt;
      frameTimer += dt * 0.01;

      if (mode === 'sniff') {
        if (frameTimer > 1) {
          frameTimer = 0;
          frameIndex = (frameIndex + 1) % FRAMES.sniff.length;
        }
        if (idleTimer > 900) {
          mode = 'sit';
          idleTimer = 0;
          frameIndex = 0;
        }
      } else if (mode === 'sit') {
        frameIndex = 0;
        if (idleTimer > 700) {
          mode = 'bite';
          idleTimer = 0;
          frameIndex = 0;
        }
      } else if (mode === 'bite') {
        if (frameTimer > 1) {
          frameTimer = 0;
          frameIndex = (frameIndex + 1) % FRAMES.bite.length;
        }
      }
    }
  }

  function drawDot(x, y, r, a) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
    ctx.fill();
  }

  function drawDog() {
    var set = FRAMES[mode] || FRAMES.run;
    var pts = set[frameIndex % set.length] || set[0];
    var dir = facing >= 0 ? 1 : -1;

    ctx.beginPath();
    ctx.ellipse(dogX, dogY + 20, 26, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fill();

    for (var i = 0; i < pts.length; i++) {
      var x = dogX + pts[i][0] * DOG_SCALE * dir;
      var y = dogY + pts[i][1] * DOG_SCALE;
      drawDot(x, y, 1.55 + (i % 3) * 0.3, 0.92);
    }

    // Crumbs near the snout (toward the cursor)
    if (mode === 'bite') {
      var sx = dogX + dir * 52 * DOG_SCALE * 0.78;
      var sy = dogY + 2;
      for (var j = 0; j < 4; j++) {
        drawDot(
          sx + (Math.random() - 0.5) * 10,
          sy + (Math.random() - 0.5) * 8,
          1 + Math.random(),
          0.28
        );
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mouseX < -1000) return;
    drawDog();
  }

  function loop(time) {
    var dt = Math.min(time - lastTime, 32);
    lastTime = time;
    update(dt, time);
    render();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
