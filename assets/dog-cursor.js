/**
 * PETLIO — UNIVERSAL DOG CURSOR
 * ============================================================
 *
 * Theme-level cursor system.
 *
 * IMPORTANT:
 * This file does NOT depend on:
 * - index.json
 * - specific section names
 * - specific section IDs
 * - a particular homepage structure
 *
 * Sections may optionally use:
 *
 *   data-cursor-mode="explore"
 *   data-cursor-mode="shop"
 *   data-cursor-mode="build"
 *   data-cursor-mode="discover"
 *   data-cursor-mode="calm"
 *   data-cursor-mode="read"
 *   data-cursor-mode="minimal"
 *   data-cursor-mode="settle"
 *
 * If no mode exists, "default" behavior is used.
 *
 * Therefore:
 * - Remove a section → cursor still works.
 * - Add a section → cursor still works.
 * - Reorder sections → cursor still works.
 * - Add a custom section → cursor still works.
 *
 * Existing dog behavior preserved:
 * - bone / ball / food bowl
 * - one dotted dog
 * - smooth following
 * - run
 * - sniff
 * - sit
 * - bite
 * - dog faces the toy when idle
 */

(function () {
  'use strict';


  /* ==========================================================
     SAFETY
     ========================================================== */

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  var coarsePointer =
    window.matchMedia &&
    window.matchMedia(
      '(pointer: coarse)'
    ).matches;

  if (reduceMotion || coarsePointer) {
    return;
  }


  /* ==========================================================
     CONFIG
     ========================================================== */

  var TOYS = [
    'bone',
    'ball',
    'plate'
  ];

  var TOY_CYCLE_MS = 14000;

  var IDLE_AFTER_MS = 500;

  var DOG_SCALE = 1.12;

  /* Stop the rAF loop after the dog has fully settled (saves main-thread work / Lighthouse). */
  var LOOP_PAUSE_AFTER_MS = 1800;


  /* ==========================================================
     CURSOR TOYS
     ========================================================== */

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


  /* ==========================================================
     DOG FRAME DATA
     ========================================================== */

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

    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[54,-3],[60,-5],[64,-2],[66,3],[62,5],[56,-8],[52,-10],[60,-9],[70,1],[72,3],[-8,-4],[-12,-8],[-15,-5],[42,10],[44,15],[46,19],[50,10],[52,14],[10,8],[8,14],[6,18],[18,8],[20,14],[22,18]],

    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[52,-1],[58,-2],[62,0],[64,4],[60,6],[54,-6],[50,-8],[58,-7],[68,3],[70,5],[-8,-3],[-11,-7],[-14,-4],[42,10],[44,15],[46,18],[50,10],[52,14],[10,8],[8,13],[6,17],[18,8],[20,13],[22,17]]
  ];


  function densify(frame) {

    var out = [];

    for (
      var i = 0;
      i < frame.length;
      i++
    ) {

      var x = frame[i][0];
      var y = frame[i][1];

      out.push([
        x,
        y
      ]);

      var a =
        (
          i * 2.4
        ) %
        (
          Math.PI * 2
        );

      out.push([
        x +
          Math.cos(a) *
          1.6,

        y +
          Math.sin(a) *
          1.6
      ]);
    }

    return out;
  }


  var FRAMES = {
    run: RUN.map(densify),
    sit: SIT.map(densify),
    sniff: SNIFF.map(densify),
    bite: BITE.map(densify)
  };


  /* ==========================================================
     SECTION MODES
     ========================================================== */

  /*
   * These are generic behaviors.
   *
   * They are NOT tied to section names.
   */

  var MODES = {

    default: {
      idleAfter: 500,
      stiffness: 0.06,
      damping: 0.78,
      behindX: -48,
      behindY: 16,
      toyCycle: 14000,
      scale: 1,
      idleType: 'normal',
      opacity: 0.90
    },

    explore: {
      idleAfter: 750,
      stiffness: 0.055,
      damping: 0.80,
      behindX: -52,
      behindY: 18,
      toyCycle: 12000,
      scale: 1,
      idleType: 'sniff',
      opacity: 0.90
    },

    shop: {
      idleAfter: 450,
      stiffness: 0.065,
      damping: 0.78,
      behindX: -46,
      behindY: 16,
      toyCycle: 9000,
      scale: 1.04,
      idleType: 'normal',
      opacity: 0.95
    },

    build: {
      idleAfter: 600,
      stiffness: 0.06,
      damping: 0.79,
      behindX: -50,
      behindY: 17,
      toyCycle: 10000,
      scale: 1.02,
      idleType: 'normal',
      opacity: 0.92
    },

    discover: {
      idleAfter: 750,
      stiffness: 0.052,
      damping: 0.81,
      behindX: -55,
      behindY: 19,
      toyCycle: 13000,
      scale: 1,
      idleType: 'sniff',
      opacity: 0.88
    },

    calm: {
      idleAfter: 1000,
      stiffness: 0.045,
      damping: 0.83,
      behindX: -60,
      behindY: 20,
      toyCycle: 18000,
      scale: 0.97,
      idleType: 'calm',
      opacity: 0.72
    },

    read: {
      idleAfter: 900,
      stiffness: 0.048,
      damping: 0.82,
      behindX: -58,
      behindY: 19,
      toyCycle: 16000,
      scale: 0.98,
      idleType: 'calm',
      opacity: 0.68
    },

    minimal: {
      idleAfter: 1100,
      stiffness: 0.042,
      damping: 0.84,
      behindX: -62,
      behindY: 20,
      toyCycle: 20000,
      scale: 0.95,
      idleType: 'calm',
      opacity: 0.58
    },

    settle: {
      idleAfter: 1250,
      stiffness: 0.038,
      damping: 0.85,
      behindX: -64,
      behindY: 21,
      toyCycle: 22000,
      scale: 0.93,
      idleType: 'settle',
      opacity: 0.48
    }

  };


  /* ==========================================================
     STATE
     ========================================================== */

  var canvas = null;
  var ctx = null;
  var toyEl = null;

  var mouseX = -9999;
  var mouseY = -9999;

  var dogX = 0;
  var dogY = 0;

  var velX = 0;
  var velY = 0;

  var behindX = -48;
  var behindY = 18;

  var facing = 1;

  var mode = 'run';

  var frameIndex = 0;
  var frameTimer = 0;

  var lastMoveTime = 0;
  var lastTime = 0;
  var idleTimer = 0;

  var toyIndex = 0;
  var lastToySwitch = 0;

  var activeCursorMode = 'default';

  var hoveredInteractive = false;

  var loopRunning = false;
  var rafId = 0;


  /* ==========================================================
     HELPERS
     ========================================================== */

  function getProfile() {

    return (
      MODES[
        activeCursorMode
      ] ||
      MODES.default
    );
  }


  function resetAnimationToRun() {

    if (
      mode === 'run'
    ) {
      return;
    }

    mode = 'run';

    idleTimer = 0;

    frameIndex = 0;

    frameTimer = 0;
  }


  /* ==========================================================
     SECTION MODE
     ========================================================== */

  function getCursorModeFromElement(element) {

    if (!element) {
      return 'default';
    }


    /*
     * Explicit section/element mode.
     *
     * This is the primary API.
     */

    var modeElement =
      element.closest(
        '[data-cursor-mode]'
      );


    if (modeElement) {

      var explicitMode =
        modeElement.getAttribute(
          'data-cursor-mode'
        );


      if (
        explicitMode &&
        MODES[explicitMode]
      ) {
        return explicitMode;
      }
    }


    /*
     * Optional element-level mode.
     *
     * Useful for a particular card/button.
     */

    var interactiveMode =
      element.closest(
        '[data-cursor-interaction]'
      );


    if (interactiveMode) {

      var interaction =
        interactiveMode.getAttribute(
          'data-cursor-interaction'
        );


      if (
        interaction === 'shop'
      ) {
        return 'shop';
      }

      if (
        interaction === 'explore'
      ) {
        return 'explore';
      }

      if (
        interaction === 'build'
      ) {
        return 'build';
      }

      if (
        interaction === 'discover'
      ) {
        return 'discover';
      }
    }


    return 'default';
  }


  function updateCursorContext() {

    if (
      mouseX < 0 ||
      mouseY < 0
    ) {
      return;
    }


    var element =
      document.elementFromPoint(
        mouseX,
        mouseY
      );


    var nextMode =
      getCursorModeFromElement(
        element
      );


    /*
     * Automatic interactive detection.
     *
     * This works even in completely new sections.
     */

    hoveredInteractive =
      !!(
        element &&
        element.closest(
          'a, button, [role="button"], input, select, textarea, .product-card, .collection-card, .card, [data-cursor-interaction]'
        )
      );


    /*
     * If no explicit section mode exists,
     * interactive elements receive a subtle
     * shop/explore personality.
     */

    if (
      nextMode === 'default' &&
      hoveredInteractive
    ) {

      nextMode = 'shop';
    }


    if (
      nextMode ===
      activeCursorMode
    ) {
      return;
    }


    activeCursorMode =
      nextMode;


    document.body.setAttribute(
      'data-dog-cursor-mode',
      activeCursorMode
    );


    /*
     * Reset timing only.
     * We do NOT teleport the dog.
     */

    lastToySwitch =
      performance.now();
  }


  /* ==========================================================
     INIT
     ========================================================== */

  function init() {

    /*
     * Prevent duplicate initialization.
     *
     * Important for Shopify Theme Editor.
     */

    if (
      document.body.classList.contains(
        'dog-cursor-initialized'
      )
    ) {
      return;
    }


    document.body.classList.add(
      'dog-cursor-initialized'
    );


    canvas =
      document.createElement(
        'canvas'
      );

    canvas.id =
      'dog-cursor-canvas';

    canvas.setAttribute(
      'aria-hidden',
      'true'
    );


    document.body.appendChild(
      canvas
    );


    ctx =
      canvas.getContext(
        '2d',
        {
          alpha: true
        }
      );


    toyEl =
      document.createElement(
        'div'
      );

    toyEl.id =
      'dog-cursor-toy';

    toyEl.setAttribute(
      'aria-hidden',
      'true'
    );


    toyEl.innerHTML =
      TOY_SVG.bone;


    document.body.appendChild(
      toyEl
    );


    document.body.classList.add(
      'dog-cursor-active'
    );


    resize();


    window.addEventListener(
      'resize',
      resize,
      {
        passive: true
      }
    );


    window.addEventListener(
      'mousemove',
      onMove,
      {
        passive: true
      }
    );


    window.addEventListener(
      'mouseleave',
      onLeave,
      {
        passive: true
      }
    );


    window.addEventListener(
      'mouseenter',
      onEnter,
      {
        passive: true
      }
    );


    window.addEventListener(
      'mousedown',
      switchToy,
      {
        passive: true
      }
    );


    dogX =
      window.innerWidth *
      0.35;

    dogY =
      window.innerHeight *
      0.5;


    lastMoveTime =
      performance.now();

    lastToySwitch =
      performance.now();

    lastTime =
      performance.now();


    startLoop();
  }


  /* ==========================================================
     RESIZE
     ========================================================== */

  function resize() {

    if (
      !canvas ||
      !ctx
    ) {
      return;
    }


    var dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );


    canvas.width =
      window.innerWidth *
      dpr;

    canvas.height =
      window.innerHeight *
      dpr;


    canvas.style.width =
      window.innerWidth +
      'px';

    canvas.style.height =
      window.innerHeight +
      'px';


    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  }


  /* ==========================================================
     POINTER
     ========================================================== */

  function startLoop() {

    if (loopRunning) {
      return;
    }

    loopRunning = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }


  function stopLoop() {

    loopRunning = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }


  function onMove(event) {

    mouseX =
      event.clientX;

    mouseY =
      event.clientY;


    lastMoveTime =
      performance.now();


    if (toyEl) {

      toyEl.classList.remove(
        'is-hidden'
      );
    }


    resetAnimationToRun();

    updateCursorContext();

    startLoop();
  }


  function onLeave() {

    mouseX = -9999;
    mouseY = -9999;


    if (toyEl) {

      toyEl.classList.add(
        'is-hidden'
      );
    }
  }


  function onEnter() {

    if (toyEl) {

      toyEl.classList.remove(
        'is-hidden'
      );
    }
  }


  /* ==========================================================
     TOY
     ========================================================== */

  function switchToy() {

    toyIndex =
      (
        toyIndex + 1
      ) %
      TOYS.length;


    if (toyEl) {

      toyEl.innerHTML =
        TOY_SVG[
          TOYS[
            toyIndex
          ]
        ];
    }


    lastToySwitch =
      performance.now();
  }


  /* ==========================================================
     UPDATE
     ========================================================== */

  function update(
    dt,
    now
  ) {

    if (
      mouseX < -1000
    ) {
      return;
    }


    updateCursorContext();


    var profile =
      getProfile();


    /*
     * Section-specific toy timing.
     */

    if (
      now -
      lastToySwitch >
      profile.toyCycle
    ) {

      switchToy();
    }


    if (toyEl) {

      toyEl.style.transform =
        'translate(' +
        mouseX +
        'px,' +
        mouseY +
        'px)';
    }


    /*
     * Idle detection.
     */

    var still =
      (
        now -
        lastMoveTime
      ) >
      profile.idleAfter;


    if (
      still &&
      mode === 'run'
    ) {

      mode =
        'sniff';

      idleTimer = 0;

      frameIndex = 0;

      frameTimer = 0;
    }


    /* --------------------------------------------------------
       POSITION
       -------------------------------------------------------- */

    var desiredBehindX =
      profile.behindX;

    var desiredBehindY =
      profile.behindY;


    var targetX;
    var targetY;


    if (
      mode === 'run'
    ) {

      /*
       * Dog follows behind movement.
       */

      if (
        Math.abs(velX) >
        0.4
      ) {

        desiredBehindX =
          velX > 0
            ? profile.behindX
            : -profile.behindX;
      }


      behindX +=
        (
          desiredBehindX -
          behindX
        ) *
        0.04;


      behindY +=
        (
          desiredBehindY -
          behindY
        ) *
        0.08;


      targetX =
        mouseX +
        behindX;


      targetY =
        mouseY +
        behindY;

    } else {

      /*
       * Idle:
       *
       * Position the BODY so the
       * SNOUT meets the toy.
       */

      var snoutReach =
        68 *
        DOG_SCALE *
        profile.scale;


      var preferLeft =
        dogX <=
        mouseX + 10;


      var dirSide =
        preferLeft
          ? 1
          : -1;


      targetX =
        mouseX -
        dirSide *
        snoutReach;


      var idleOffset =
        mode === 'sit'
          ? 18
          : 6;


      if (
        profile.idleType === 'calm' ||
        profile.idleType === 'settle'
      ) {

        idleOffset += 5;
      }


      targetY =
        mouseY +
        idleOffset;


      behindX +=
        (
          (
            preferLeft
              ? -snoutReach
              : snoutReach
          ) -
          behindX
        ) *
        0.15;


      behindY +=
        (
          idleOffset -
          behindY
        ) *
        0.12;
    }


    /* --------------------------------------------------------
       PHYSICS
       -------------------------------------------------------- */

    var dx =
      targetX -
      dogX;

    var dy =
      targetY -
      dogY;


    var stiffness =
      (
        mode === 'bite' ||
        mode === 'sniff'
      )
        ? profile.stiffness * 2
        : profile.stiffness;


    velX +=
      dx *
      stiffness;

    velY +=
      dy *
      stiffness;


    velX *=
      profile.damping;

    velY *=
      profile.damping;


    dogX +=
      velX;

    dogY +=
      velY;


    /* --------------------------------------------------------
       FACING
       -------------------------------------------------------- */

    if (
      mode === 'run'
    ) {

      if (
        velX >
        0.35
      ) {

        facing +=
          (
            1 -
            facing
          ) *
          0.12;

      } else if (
        velX <
        -0.35
      ) {

        facing +=
          (
            -1 -
            facing
          ) *
          0.12;
      }

    } else {

      /*
       * Idle dog always faces toy.
       */

      var want =
        dogX <
        mouseX
          ? 1
          : -1;


      facing +=
        (
          want -
          facing
        ) *
        0.2;
    }


    if (
      facing >
      0.85
    ) {
      facing = 1;
    }


    if (
      facing <
      -0.85
    ) {
      facing = -1;
    }


    /* --------------------------------------------------------
       ANIMATION
       -------------------------------------------------------- */

    if (
      mode === 'run'
    ) {

      var speed =
        Math.hypot(
          velX,
          velY
        );


      var speedMultiplier =
        (
          profile.idleType === 'calm' ||
          profile.idleType === 'settle'
        )
          ? 0.65
          : 1;


      frameTimer +=
        dt *
        (
          0.012 +
          speed *
          0.03
        ) *
        speedMultiplier;


      if (
        frameTimer >
        1
      ) {

        frameTimer = 0;

        frameIndex =
          (
            frameIndex + 1
          ) %
          FRAMES.run.length;
      }


      return;
    }


    idleTimer +=
      dt;


    frameTimer +=
      dt *
      (
        profile.idleType === 'calm' ||
        profile.idleType === 'settle'
          ? 0.006
          : 0.01
      );


    /* --------------------------------------------------------
       SNIFF
       -------------------------------------------------------- */

    if (
      mode === 'sniff'
    ) {

      if (
        frameTimer >
        1
      ) {

        frameTimer = 0;

        frameIndex =
          (
            frameIndex + 1
          ) %
          FRAMES.sniff.length;
      }


      var sniffDuration =
        (
          profile.idleType === 'calm' ||
          profile.idleType === 'settle'
        )
          ? 1300
          : 900;


      if (
        idleTimer >
        sniffDuration
      ) {

        mode =
          'sit';

        idleTimer = 0;

        frameIndex = 0;
      }


      return;
    }


    /* --------------------------------------------------------
       SIT
       -------------------------------------------------------- */

    if (
      mode === 'sit'
    ) {

      frameIndex = 0;


      /*
       * Calm sections remain calm.
       */

      if (
        profile.idleType === 'calm' ||
        profile.idleType === 'settle'
      ) {

        return;
      }


      if (
        idleTimer >
        700
      ) {

        mode =
          'bite';

        idleTimer = 0;

        frameIndex = 0;
      }


      return;
    }


    /* --------------------------------------------------------
       BITE
       -------------------------------------------------------- */

    if (
      mode === 'bite'
    ) {

      if (
        frameTimer >
        1
      ) {

        frameTimer = 0;

        frameIndex =
          (
            frameIndex + 1
          ) %
          FRAMES.bite.length;
      }
    }
  }


  /* ==========================================================
     DRAW DOT
     ========================================================== */

  function drawDot(
    x,
    y,
    radius,
    alpha
  ) {

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      'rgba(0,0,0,' +
      alpha +
      ')';

    ctx.fill();
  }


  /* ==========================================================
     DRAW DOG
     ========================================================== */

  function drawDog() {

    var profile =
      getProfile();


    var set =
      FRAMES[
        mode
      ] ||
      FRAMES.run;


    var points =
      set[
        frameIndex %
        set.length
      ] ||
      set[0];


    var direction =
      facing >= 0
        ? 1
        : -1;


    var scale =
      DOG_SCALE *
      profile.scale;


    /*
     * Ground shadow.
     */

    ctx.beginPath();

    ctx.ellipse(
      dogX,
      dogY + 20,
      26 * profile.scale,
      7 * profile.scale,
      0,
      0,
      Math.PI * 2
    );


    ctx.fillStyle =
      'rgba(0,0,0,0.1)';

    ctx.fill();


    /*
     * Dog body.
     */

    for (
      var i = 0;
      i < points.length;
      i++
    ) {

      var x =
        dogX +
        points[i][0] *
        scale *
        direction;


      var y =
        dogY +
        points[i][1] *
        scale;


      drawDot(
        x,
        y,
        (
          1.55 +
          (
            i % 3
          ) *
          0.3
        ) *
        profile.scale,
        0.92
      );
    }


    /*
     * Food crumbs only when biting.
     */

    if (
      mode === 'bite'
    ) {

      var sx =
        dogX +
        direction *
        52 *
        scale *
        0.78;


      var sy =
        dogY + 2;


      for (
        var j = 0;
        j < 4;
        j++
      ) {

        drawDot(
          sx +
            (
              Math.random() -
              0.5
            ) *
            10,

          sy +
            (
              Math.random() -
              0.5
            ) *
            8,

          1 +
            Math.random(),

          0.28
        );
      }
    }
  }


  /* ==========================================================
     RENDER
     ========================================================== */

  function render() {

    if (
      !ctx ||
      !canvas
    ) {
      return;
    }


    ctx.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );


    if (
      mouseX <
      -1000
    ) {
      return;
    }


    drawDog();
  }


  /* ==========================================================
     LOOP
     ========================================================== */

  function loop(time) {

    if (!loopRunning) {
      return;
    }

    var dt =
      Math.min(
        time -
        lastTime,
        32
      );


    lastTime =
      time;


    update(
      dt,
      time
    );


    render();


    /*
     * Pause the loop once the dog has settled into a static sit
     * and the pointer has been still long enough. Restarts on
     * the next mousemove via startLoop().
     */
    var settled =
      mode === 'sit' &&
      Math.abs(velX) < 0.05 &&
      Math.abs(velY) < 0.05 &&
      (time - lastMoveTime) > LOOP_PAUSE_AFTER_MS;

    var pointerGone =
      mouseX < -1000 &&
      (time - lastMoveTime) > LOOP_PAUSE_AFTER_MS;

    if (settled || pointerGone) {
      stopLoop();
      return;
    }

    rafId = requestAnimationFrame(loop);
  }


  /* ==========================================================
     START
     ========================================================== */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();
  }

})();