/**
 * Petlio – 3D-style dotted dog + toy cursor
 *
 * - Cursor is a toy: bone | ball | food plate (cycles every few seconds, or fixed)
 * - Dog made of black dots runs BEHIND the toy with lag
 * - Soft 3D depth (shadows, scale, slight tilt)
 * - When cursor stops: dog approaches and bites / chews / eats
 * - Multiply blend makes the dog darken section content (feels behind the UI)
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------
  const TOY_TYPES = ['bone', 'ball', 'plate']; // cycles
  const TOY_CYCLE_MS = 12000;                  // change toy every 12s
  const IDLE_DELAY_MS = 450;                   // how long still before “bite”
  const DOG_SCALE = 1.15;
  const TOY_SCALE = 1.0;

  // ---------------------------------------------------------------------------
  // Dog run frames (relative points) – densified at runtime
  // ---------------------------------------------------------------------------
  const DOG_RUN = [
    // 0 – extended
    [
      [0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],
      [56,-6],[62,-10],[66,-8],[68,-4],[64,0],
      [58,-14],[54,-16],[62,-15],
      [72,-6],[74,-4],
      [-8,-6],[-14,-12],[-18,-8],
      [42,8],[44,16],[46,24],[50,8],[52,14],[54,20],
      [10,6],[8,14],[6,22],[18,6],[20,14],[22,22]
    ],
    // 1 – mid
    [
      [0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],
      [56,-6],[62,-10],[66,-8],[68,-4],[64,0],
      [58,-14],[54,-16],[62,-15],
      [72,-6],[74,-4],
      [-8,-4],[-12,-10],[-16,-6],
      [42,6],[40,12],[38,18],[50,8],[54,12],[58,16],
      [10,8],[14,14],[18,18],[18,4],[16,10],[12,16]
    ],
    // 2 – opposite
    [
      [0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],
      [56,-6],[62,-10],[66,-8],[68,-4],[64,0],
      [58,-14],[54,-16],[62,-15],
      [72,-6],[74,-4],
      [-6,-8],[-12,-14],[-16,-10],
      [44,6],[48,14],[52,22],[48,8],[46,16],[44,24],
      [8,4],[4,10],[0,16],[20,8],[24,14],[28,20]
    ],
    // 3 – recovery
    [
      [0,0],[8,-2],[16,-1],[24,0],[32,1],[40,0],[48,-2],
      [56,-6],[62,-10],[66,-8],[68,-4],[64,0],
      [58,-14],[54,-16],[62,-15],
      [72,-6],[74,-4],
      [-10,-5],[-15,-11],[-18,-7],
      [40,8],[38,14],[36,20],[52,6],[56,12],[60,18],
      [12,6],[16,12],[20,18],[16,6],[12,12],[8,18]
    ]
  ];

  // Bite / chew / eat – head dips toward toy, jaw motion
  const DOG_BITE = [
    // approach – head lower
    [
      [0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],
      [54,-2],[60,-4],[64,-2],[66,2],[62,4],
      [56,-8],[52,-10],[60,-9],
      [70,0],[72,2],
      [-8,-4],[-12,-8],[-16,-5],
      [42,10],[44,16],[46,20],[50,10],[52,14],[54,18],
      [10,8],[8,14],[6,18],[18,8],[20,14],[22,18]
    ],
    // bite down
    [
      [0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],
      [52,0],[58,-1],[62,1],[64,5],[60,7],
      [54,-5],[50,-7],[58,-6],
      [68,4],[70,6],
      [-8,-3],[-11,-6],[-14,-4],
      [42,10],[44,15],[46,18],[50,10],[52,14],[54,17],
      [10,8],[8,13],[6,17],[18,8],[20,13],[22,17]
    ],
    // chew open
    [
      [0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],
      [54,-3],[60,-5],[64,-2],[66,3],[62,5],
      [56,-8],[52,-10],[60,-9],
      [70,1],[72,3],
      [-8,-4],[-12,-8],[-15,-5],
      [42,10],[44,15],[46,19],[50,10],[52,14],[54,18],
      [10,8],[8,13],[6,17],[18,8],[20,13],[22,17]
    ],
    // chew close
    [
      [0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],
      [52,-1],[58,-2],[62,0],[64,4],[60,6],
      [54,-6],[50,-8],[58,-7],
      [68,3],[70,5],
      [-8,-3],[-11,-7],[-14,-4],
      [42,10],[44,15],[46,18],[50,10],[52,14],[54,17],
      [10,8],[8,13],[6,17],[18,8],[20,13],[22,17]
    ]
  ];

  function densify(frame, radius, count) {
    const out = [];
    for (let i = 0; i < frame.length; i++) {
      const x = frame[i][0], y = frame[i][1];
      out.push([x, y]);
      for (let k = 0; k < count; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
      }
    }
    return out;
  }

  const RUN_FRAMES = DOG_RUN.map(f => densify(f, 2.4, 1));
  const BITE_FRAMES = DOG_BITE.map(f => densify(f, 2.2, 1));

  // ---------------------------------------------------------------------------
  // Toy shapes (relative points) – drawn as black dots for consistency
  // ---------------------------------------------------------------------------
  function bonePoints() {
    // Classic dog bone outline (horizontal)
    const pts = [];
    // shaft
    for (let x = -18; x <= 18; x += 3) pts.push([x, 0], [x, 2], [x, -2]);
    // left knobs
    [[-22,-6],[-26,-4],[-28,0],[-26,4],[-22,6],[-18,4],[-18,-4]].forEach(p => pts.push(p));
    // right knobs
    [[22,-6],[26,-4],[28,0],[26,4],[22,6],[18,4],[18,-4]].forEach(p => pts.push(p));
    return densify(pts, 1.8, 1);
  }

  function ballPoints() {
    const pts = [];
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      pts.push([Math.cos(a) * 12, Math.sin(a) * 12]);
      pts.push([Math.cos(a) * 8, Math.sin(a) * 8]);
    }
    pts.push([0, 0], [4, 4], [-4, 4], [4, -4], [-4, -4]);
    // highlight dots
    pts.push([-3, -5], [-5, -3]);
    return densify(pts, 1.5, 1);
  }

  function platePoints() {
    const pts = [];
    // outer rim
    for (let a = 0; a < Math.PI * 2; a += 0.28) {
      pts.push([Math.cos(a) * 16, Math.sin(a) * 10]);
    }
    // inner bowl
    for (let a = 0; a < Math.PI * 2; a += 0.4) {
      pts.push([Math.cos(a) * 9, Math.sin(a) * 5.5]);
    }
    // food pile in center
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 6;
      pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.55 - 1]);
    }
    return densify(pts, 1.4, 0);
  }

  const TOY_SHAPES = {
    bone: bonePoints(),
    ball: ballPoints(),
    plate: platePoints()
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let canvas, ctx;
  let mouseX = -9999, mouseY = -9999;
  let toyX = 0, toyY = 0;
  let dogX = 0, dogY = 0;
  let velX = 0, velY = 0;
  let toyVelX = 0, toyVelY = 0;

  let runFrame = 0, runTimer = 0;
  let biteFrame = 0, biteTimer = 0;
  let mode = 'run'; // 'run' | 'bite'
  let idleSince = 0;
  let lastMoveTime = 0;
  let lastTime = 0;
  let facingRight = true;

  let toyTypeIndex = 0;
  let toyType = TOY_TYPES[0];
  let lastToySwitch = 0;

  // Soft trail of dog positions for “behind” feel
  const trail = [];
  const MAX_TRAIL = 12;

  // 3D-ish tilt of the toy
  let toyTiltX = 0, toyTiltY = 0;

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'dog-cursor-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    document.body.classList.add('dog-cursor-active');

    ctx = canvas.getContext('2d', { alpha: true });
    resize();

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', () => {
      mouseX = -9999;
      mouseY = -9999;
    });

    // Optional: click cycles toy
    window.addEventListener('mousedown', () => {
      toyTypeIndex = (toyTypeIndex + 1) % TOY_TYPES.length;
      toyType = TOY_TYPES[toyTypeIndex];
      lastToySwitch = performance.now();
    }, { passive: true });

    dogX = window.innerWidth * 0.4;
    dogY = window.innerHeight * 0.5;
    toyX = dogX + 60;
    toyY = dogY;

    lastMoveTime = performance.now();
    lastToySwitch = performance.now();
    requestAnimationFrame(loop);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    if (mode === 'bite') mode = 'run';
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------
  function update(dt, now) {
    if (mouseX < -1000) return;

    // Auto-cycle toy occasionally
    if (now - lastToySwitch > TOY_CYCLE_MS) {
      toyTypeIndex = (toyTypeIndex + 1) % TOY_TYPES.length;
      toyType = TOY_TYPES[toyTypeIndex];
      lastToySwitch = now;
    }

    // --- Toy follows mouse tightly (it IS the cursor) ---
    const tdx = mouseX - toyX;
    const tdy = mouseY - toyY;
    toyVelX += tdx * 0.35;
    toyVelY += tdy * 0.35;
    toyVelX *= 0.55;
    toyVelY *= 0.55;
    toyX += toyVelX;
    toyY += toyVelY;

    // Subtle 3D tilt from velocity
    toyTiltX += (toyVelY * 0.08 - toyTiltX) * 0.15;
    toyTiltY += (-toyVelX * 0.08 - toyTiltY) * 0.15;

    const speed = Math.hypot(toyVelX, toyVelY);
    const still = speed < 0.35 && (now - lastMoveTime) > IDLE_DELAY_MS;

    if (still) {
      mode = 'bite';
    } else if (speed > 0.8) {
      mode = 'run';
    }

    // --- Dog chases a point BEHIND the toy ---
    // Offset so dog stays slightly behind and below the toy
    const behind = facingRight ? -55 : 55;
    const targetX = toyX + behind;
    const targetY = toyY + 18;

    const dx = targetX - dogX;
    const dy = targetY - dogY;

    // Stronger pull when biting so dog closes in on the toy
    const stiff = mode === 'bite' ? 0.14 : 0.07;
    const damp = mode === 'bite' ? 0.72 : 0.78;

    velX += dx * stiff;
    velY += dy * stiff;
    velX *= damp;
    velY *= damp;
    dogX += velX;
    dogY += velY;

    if (Math.abs(velX) > 0.12) facingRight = velX > 0;

    // Animations
    if (mode === 'run') {
      const sp = Math.hypot(velX, velY);
      runTimer += dt * (0.011 + sp * 0.035);
      if (runTimer > 1) {
        runTimer = 0;
        runFrame = (runFrame + 1) % RUN_FRAMES.length;
      }
      biteFrame = 0;
      biteTimer = 0;
    } else {
      // bite / chew cycle
      biteTimer += dt * 0.009;
      if (biteTimer > 1) {
        biteTimer = 0;
        biteFrame = (biteFrame + 1) % BITE_FRAMES.length;
      }
    }

    // Trail
    if (Math.hypot(velX, velY) > 0.5 && trail.length < MAX_TRAIL) {
      trail.push({
        x: dogX, y: dogY,
        frame: runFrame,
        facing: facingRight,
        life: 1
      });
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= dt * 0.003;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Draw helpers – fake 3D via shadow + scale + tilt
  // ---------------------------------------------------------------------------
  function drawDot(x, y, r, alpha) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
    ctx.fill();
  }

  function drawShadow(cx, cy, rx, ry, alpha) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 22, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
    ctx.fill();
  }

  function drawPoints(points, cx, cy, scale, faceRight, alpha, tiltX, tiltY) {
    const dir = faceRight ? 1 : -1;
    for (let i = 0; i < points.length; i++) {
      let px = points[i][0] * scale * dir;
      let py = points[i][1] * scale;
      // cheap 3D tilt
      if (tiltX || tiltY) {
        py += px * tiltX * 0.4;
        px += py * tiltY * 0.25;
      }
      const r = 1.5 + (i % 3) * 0.35;
      drawDot(cx + px, cy + py, r, alpha);
    }
  }

  function drawToy(cx, cy) {
    const pts = TOY_SHAPES[toyType] || TOY_SHAPES.bone;
    // Ground shadow for depth
    drawShadow(cx, cy, 18, 6, 0.12);
    // Toy itself (slightly larger when “in front”)
    drawPoints(pts, cx, cy, TOY_SCALE, true, 0.95, toyTiltX, toyTiltY);

    // Tiny sparkle / motion dots when moving fast
    const sp = Math.hypot(toyVelX, toyVelY);
    if (sp > 2) {
      for (let i = 0; i < 4; i++) {
        drawDot(
          cx - toyVelX * (0.5 + i * 0.4) + (Math.random() - 0.5) * 6,
          cy - toyVelY * (0.5 + i * 0.4) + (Math.random() - 0.5) * 6,
          1.2,
          0.2
        );
      }
    }
  }

  function drawDog() {
    // Shadow under dog (farther = softer) → depth cue
    drawShadow(dogX, dogY, 28, 8, 0.1);

    // Trail (behind)
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const fr = RUN_FRAMES[t.frame] || RUN_FRAMES[0];
      drawPoints(fr, t.x, t.y, DOG_SCALE * 0.9, t.facing, t.life * 0.28, 0, 0);
    }

    // Main dog – slightly smaller scale than toy so it reads as “behind”
    const frames = mode === 'bite' ? BITE_FRAMES : RUN_FRAMES;
    const fi = mode === 'bite' ? biteFrame : runFrame;
    const pts = frames[fi] || frames[0];
    const alpha = mode === 'bite' ? 0.98 : 0.9;
    drawPoints(pts, dogX, dogY, DOG_SCALE, facingRight, alpha, 0, 0);

    // When biting, extra dots near the snout toward the toy (chew crumbs / food)
    if (mode === 'bite') {
      const snoutX = dogX + (facingRight ? 55 : -55) * DOG_SCALE * 0.7;
      const snoutY = dogY + 4;
      for (let i = 0; i < 5; i++) {
        drawDot(
          snoutX + (Math.random() - 0.5) * 14,
          snoutY + (Math.random() - 0.5) * 10,
          1.1 + Math.random(),
          0.25 + Math.random() * 0.2
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Soft “curve / depth” vignette near the dog (content feels pushed)
  // ---------------------------------------------------------------------------
  function drawDepthWarp() {
    // Very soft radial darkening around dog – reads as depth without distorting layout
    const g = ctx.createRadialGradient(dogX, dogY, 10, dogX, dogY, 120);
    g.addColorStop(0, 'rgba(0,0,0,0.04)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.02)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(dogX - 130, dogY - 130, 260, 260);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mouseX < -1000) return;

    drawDepthWarp();
    drawDog();   // dog first = visually behind
    drawToy(toyX, toyY); // toy on top = the cursor
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------
  function loop(time) {
    const dt = Math.min(time - lastTime, 32);
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
