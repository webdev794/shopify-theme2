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
 * Dog behavior (unchanged from the previous dot-matrix version):
 * - bone / ball / food bowl toy cursor
 * - smooth spring-following
 * - run / sniff / sit / bite idle chain
 * - dog faces the toy when idle
 *
 * Rendering (new):
 * - The dog is now an illustrated SVG (gradient fur, ears, tail, legs)
 *   positioned with a DOM transform, instead of a canvas dot-cloud.
 * - Pose per mode (run/sniff/sit/bite) is driven by CSS via a
 *   data-dog-mode attribute; this file only decides *which* mode is
 *   active and where the dog sits, same as before.
 * - Kept semi-translucent and modestly sized so it doesn't sit heavily
 *   over page text as it roams.
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

  var DOG_SCALE = 1.12;

  /* Stop the rAF loop after the dog has fully settled (saves main-thread work / Lighthouse). */
  var LOOP_PAUSE_AFTER_MS = 1800;

  var CRUMB_INTERVAL_MS = 190;


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
     DOG SVG
     ------------------------------------------------------------
     Drawn facing right (snout toward high x). The container is
     mirrored with scaleX(-1) at runtime when the dog is facing left,
     same convention as the old point-cloud data used.
     ========================================================== */

  var DOG_SVG =
    '<svg viewBox="0 0 130 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="dogFur" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#c9812f"/>' +
    '<stop offset="45%" stop-color="#e2a35c"/>' +
    '<stop offset="100%" stop-color="#f6dfb0"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<ellipse class="dog-cursor__shadow" cx="58" cy="57" rx="30" ry="4.5" fill="rgba(60,40,20,0.16)"/>' +
    '<g class="dog-cursor__tail">' +
    '<path d="M30 38C18 30 8 18 12 10C18 14 24 22 30 30C34 26 34 20 30 14C38 20 40 30 34 38Z" fill="url(#dogFur)"/>' +
    '<path d="M18 20C16 16 16 12 19 10C22 14 24 20 26 26" stroke="#f8ecd4" stroke-width="0.8" fill="none" opacity="0.5"/>' +
    '</g>' +
    '<g class="dog-cursor__legs-back">' +
    '<path d="M32 48C30 48 29 52 30 58L36 58C37 52 36 48 34 48Z" fill="#8a5a2e"/>' +
    '<path d="M38 48C36 48 35 52 36 58L42 58C43 52 42 48 40 48Z" fill="#c98a4a"/>' +
    '</g>' +
    '<g class="dog-cursor__body">' +
    '<ellipse cx="56" cy="40" rx="28" ry="18" fill="url(#dogFur)"/>' +
    '<ellipse cx="52" cy="50" rx="20" ry="10" fill="#faeccb" opacity="0.65"/>' +
    '</g>' +
    '<g class="dog-cursor__legs-front">' +
    '<path d="M68 46C66 46 65 50 66 58L72 58C73 50 72 46 70 46Z" fill="#8a5a2e"/>' +
    '<path d="M76 46C74 46 73 50 74 58L80 58C81 50 80 46 78 46Z" fill="#c98a4a"/>' +
    '</g>' +
    '<g class="dog-cursor__head">' +
    '<path d="M84 16C76 10 70 14 70 24C70 34 78 37 84 31C80 27 78 21 84 16Z" fill="#8a5a2e"/>' +
    '<circle cx="94" cy="27" r="15" fill="url(#dogFur)"/>' +
    '<path d="M90 33C100 32 112 31 118 34C112 39 100 41 92 40Z" fill="#e7bd85"/>' +
    '<ellipse cx="116" cy="34" rx="3" ry="2.3" fill="#3b2417"/>' +
    '<circle cx="97" cy="24" r="2.3" fill="#241408"/>' +
    '<circle cx="97.8" cy="23.2" r="0.7" fill="#fff6df"/>' +
    '<path class="dog-cursor__mouth-closed" d="M92 40C97 42.5 104 42.5 109 40" stroke="#5c3a1c" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '<path class="dog-cursor__mouth-open" d="M92 40C96 46 105 46 109 40C104 43.5 97 43.5 92 40Z" fill="#7a2e2e"/>' +
    '</g>' +
    '</svg>';


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

  var dogEl = null;
  var toyEl = null;
  var crumbEl = null;

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

  var idleTimer = 0;

  var lastMoveTime = 0;
  var lastTime = 0;

  var toyIndex = 0;
  var lastToySwitch = 0;
  var lastCrumbAt = 0;

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


    dogEl =
      document.createElement(
        'div'
      );

    dogEl.id =
      'dog-cursor-dog';

    dogEl.setAttribute(
      'aria-hidden',
      'true'
    );

    dogEl.setAttribute(
      'data-dog-mode',
      'run'
    );

    dogEl.innerHTML =
      DOG_SVG;

    document.body.appendChild(
      dogEl
    );


    crumbEl =
      document.createElement(
        'div'
      );

    crumbEl.id =
      'dog-cursor-crumbs';

    crumbEl.setAttribute(
      'aria-hidden',
      'true'
    );

    document.body.appendChild(
      crumbEl
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


    /*
     * Publish position for other on-page creatures (the scroll bird
     * and scroll monkey use this to notice the dog getting close and
     * flee). Cheap shared object, no dependency in either direction —
     * if this script isn't loaded, the others just never see a threat.
     */

    window.PetlioCursorPet =
      window.PetlioCursorPet ||
      {};

    window.PetlioCursorPet.x =
      dogX;

    window.PetlioCursorPet.y =
      dogY;


    lastMoveTime =
      performance.now();

    lastToySwitch =
      performance.now();

    lastTime =
      performance.now();


    applyDogTransform();

    startLoop();
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


    if (window.PetlioCursorPet) {

      window.PetlioCursorPet.x = -9999;
      window.PetlioCursorPet.y = -9999;
    }


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
     CRUMBS (bite mode flourish)
     ========================================================== */

  function spawnCrumb(x, y) {

    if (!crumbEl) {
      return;
    }

    var crumb =
      document.createElement(
        'span'
      );

    crumb.className =
      'dog-cursor__crumb';

    crumb.style.left =
      x.toFixed(1) +
      'px';

    crumb.style.top =
      y.toFixed(1) +
      'px';

    var dx =
      (
        Math.random() * 12 - 6
      ).toFixed(1) +
      'px';

    var dy =
      (
        8 + Math.random() * 10
      ).toFixed(1) +
      'px';

    crumb.style.setProperty(
      '--crumb-dx',
      dx
    );

    crumb.style.setProperty(
      '--crumb-dy',
      dy
    );

    crumbEl.appendChild(
      crumb
    );

    crumb.addEventListener(
      'animationend',
      function () {

        if (crumb.parentNode) {
          crumb.parentNode.removeChild(
            crumb
          );
        }
      },
      {
        once: true
      }
    );
  }


  /* ==========================================================
     RENDER (DOM transform, mode attribute)
     ========================================================== */

  function applyDogTransform() {

    if (!dogEl) {
      return;
    }

    var profile =
      getProfile();

    var direction =
      facing >= 0
        ? 1
        : -1;

    var scale =
      DOG_SCALE *
      profile.scale;

    dogEl.style.transform =
      'translate3d(' +
      dogX.toFixed(1) +
      'px,' +
      dogY.toFixed(1) +
      'px,0) scaleX(' +
      direction +
      ') scale(' +
      scale.toFixed(3) +
      ')';
  }


  function applyDogMode() {

    if (!dogEl) {
      return;
    }

    if (
      dogEl.getAttribute(
        'data-dog-mode'
      ) === mode
    ) {
      return;
    }

    dogEl.setAttribute(
      'data-dog-mode',
      mode
    );
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


    window.PetlioCursorPet.x = dogX;
    window.PetlioCursorPet.y = dogY;


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
       MODE TIMING (run → sniff → sit → bite)
       -------------------------------------------------------- */

    if (
      mode === 'run'
    ) {

      applyDogMode();
      applyDogTransform();

      return;
    }


    idleTimer +=
      dt;


    /* SNIFF */

    if (
      mode === 'sniff'
    ) {

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
      }


      applyDogMode();
      applyDogTransform();

      return;
    }


    /* SIT */

    if (
      mode === 'sit'
    ) {

      /*
       * Calm sections remain calm.
       */

      if (
        profile.idleType === 'calm' ||
        profile.idleType === 'settle'
      ) {

        applyDogMode();
        applyDogTransform();

        return;
      }


      if (
        idleTimer >
        700
      ) {

        mode =
          'bite';

        idleTimer = 0;
      }


      applyDogMode();
      applyDogTransform();

      return;
    }


    /* BITE */

    if (
      mode === 'bite'
    ) {

      applyDogMode();
      applyDogTransform();

      if (
        now -
        lastCrumbAt >
        CRUMB_INTERVAL_MS
      ) {

        lastCrumbAt =
          now;

        var direction =
          facing >= 0
            ? 1
            : -1;

        var scale =
          DOG_SCALE *
          profile.scale;

        var sx =
          dogX +
          direction *
          52 *
          scale *
          0.78;

        var sy =
          dogY +
          2;

        spawnCrumb(
          sx +
            (
              Math.random() - 0.5
            ) *
            8,
          sy +
            (
              Math.random() - 0.5
            ) *
            6
        );
      }
    }
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