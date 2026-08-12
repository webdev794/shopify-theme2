/**
 * Petlio – Product SVG cursor + single dotted dog
 *
 * CURSOR STORY
 * ------------------------------------------------------------
 * Hero            → playful / run
 * Shop by Pet     → explore
 * Products        → shop / sniff
 * Outfit Builder  → build
 * Lookbook        → discover
 * Care Ritual     → calm
 * Stories         → read
 * FAQ / Trust     → minimal
 * Newsletter      → settle
 *
 * Existing behavior intentionally preserved:
 * - Cursor = bone / ball / food bowl
 * - Exactly ONE dotted dog
 * - Dog follows smoothly behind cursor
 * - Stop → sniff → sit → bite
 * - Idle dog faces the toy with its snout touching it
 *
 * New behavior:
 * - Current homepage section is detected automatically
 * - Each section adjusts dog movement / idle timing
 * - No section-specific duplicate cursor instances
 */

(function () {
  'use strict';

  /* =========================================================
     BASIC SAFETY
     ========================================================= */

  if (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  if (
    window.matchMedia('(pointer: coarse)').matches
  ) {
    return;
  }

  /* =========================================================
     CURSOR TOYS
     ========================================================= */

  var TOYS = [
    'bone',
    'ball',
    'plate'
  ];

  var TOY_CYCLE_MS = 14000;

  /*
   * Base idle time.
   * Individual sections can make this faster/slower.
   */
  var IDLE_AFTER_MS = 500;

  var DOG_SCALE = 1.12;


  /* =========================================================
     TOY SVG
     ========================================================= */

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


  /* =========================================================
     DOG FRAME DATA
     ========================================================= */

  // Dog faces +X.
  // Head is at high X.
  // Tail is at low X.

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
    [[0,0],[8,-1],[16,0],[24,1],[32,1],[40,0],[48,-1],[56,-2],[64,-3],[70,-2],[74,0],[70,3],[58,-8],[54,-10],[62,-9],[78,0],[-8,-4],[-12,-8],[-16,-4],[42,8],[44,14],[46,18],[50,8],[52,12],[10,8],[8,14],[6,18],[18,8],[20,14],[22,18]],

    [[0,0],[8,-1],[16,0],[24,1],[32,1],[40,0],[48,-1],[56,-3],[64,-4],[70,-3],[74,-1],[70,2],[58,-9],[54,-11],[62,-10],[78,-1],[-8,-4],[-12,-8],[-16,-4],[42,8],[44,14],[46,18],[50,8],[52,12],[10,8],[8,14],[6,18],[18,8],[20,14],[22,18]]
  ];

  var BITE = [
    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[54,-2],[60,-4],[64,-2],[66,2],[62,4],[56,-8],[52,-10],[60,-9],[70,0],[72,2],[-8,-4],[-12,-8],[-16,-5],[42,10],[44,16],[46,20],[50,10],[52,14],[10,8],[8,14],[6,18],[18,8],[20,14],[22,18]],

    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[52,0],[58,-1],[62,1],[64,5],[60,7],[54,-5],[50,-7],[58,-6],[68,4],[70,6],[-8,-3],[-11,-6],[-14,-4],[42,10],[44,15],[46,18],[50,10],[52,14],[10,8],[8,13],[6,17],[18,8],[20,13],[22,17]],

    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[54,-3],[60,-5],[64,-2],[66,3],[62,5],[56,-8],[52,-10],[60,-9],[70,1],[72,3],[-8,-4],[-12,-8],[-15,-5],[40,8],[38,14],[36,20],[52,6],[56,12],[60,18],[12,6],[16,12],[20,18],[16,6],[12,12],[8,18]],

    [[0,0],[8,-1],[16,0],[24,1],[32,2],[40,1],[48,-1],[52,-1],[58,-2],[62,0],[64,4],[60,6],[54,-6],[50,-8],[58,-7],[68,3],[70,5],[-8,-3],[-11,-6],[-14,-4],[42,10],[44,15],[46,18],[50,10],[52,14],[10,8],[8,13],[6,17],[18,8],[20,13],[22,17]]
  ];


  function densify(frame) {
    var out = [];

    for (var i = 0; i < frame.length; i++) {
      var x = frame[i][0];
      var y = frame[i][1];

      out.push([x, y]);

      var a =
        (i * 2.4) %
        (Math.PI * 2);

      out.push([
        x + Math.cos(a) * 1.6,
        y + Math.sin(a) * 1.6
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


  /* =========================================================
     STATE
     ========================================================= */

  var canvas;
  var ctx;
  var toyEl;

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

  var currentSection = 'hero';
  var currentSectionElement = null;


  /* =========================================================
     SECTION PROFILES
     ========================================================= */

  var SECTION_PROFILES = {

    hero: {
      idleAfter: 650,
      followStiffness: 0.065,
      damping: 0.78,
      behindDistance: 48,
      behindY: 16,
      toyCycle: 14000,
      idleStyle: 'normal',
      scale: 1.00
    },

    explore: {
      idleAfter: 850,
      followStiffness: 0.055,
      damping: 0.80,
      behindDistance: 54,
      behindY: 18,
      toyCycle: 12000,
      idleStyle: 'sniff',
      scale: 1.00
    },

    shop: {
      idleAfter: 420,
      followStiffness: 0.070,
      damping: 0.77,
      behindDistance: 46,
      behindY: 15,
      toyCycle: 9000,
      idleStyle: 'normal',
      scale: 1.04
    },

    build: {
      idleAfter: 600,
      followStiffness: 0.060,
      damping: 0.79,
      behindDistance: 50,
      behindY: 17,
      toyCycle: 10000,
      idleStyle: 'normal',
      scale: 1.02
    },

    discover: {
      idleAfter: 760,
      followStiffness: 0.052,
      damping: 0.81,
      behindDistance: 56,
      behindY: 18,
      toyCycle: 13000,
      idleStyle: 'sniff',
      scale: 1.00
    },

    calm: {
      idleAfter: 1000,
      followStiffness: 0.045,
      damping: 0.83,
      behindDistance: 60,
      behindY: 20,
      toyCycle: 18000,
      idleStyle: 'calm',
      scale: 0.96
    },

    read: {
      idleAfter: 900,
      followStiffness: 0.048,
      damping: 0.82,
      behindDistance: 58,
      behindY: 19,
      toyCycle: 16000,
      idleStyle: 'calm',
      scale: 0.97
    },

    minimal: {
      idleAfter: 1100,
      followStiffness: 0.042,
      damping: 0.84,
      behindDistance: 62,
      behindY: 20,
      toyCycle: 20000,
      idleStyle: 'calm',
      scale: 0.94
    },

    settle: {
      idleAfter: 1250,
      followStiffness: 0.038,
      damping: 0.85,
      behindDistance: 64,
      behindY: 21,
      toyCycle: 22000,
      idleStyle: 'settle',
      scale: 0.92
    }

  };


  /* =========================================================
     SECTION DETECTION
     ========================================================= */

  function getSectionProfile() {

    /*
     * Explicit attribute takes priority.
     *
     * Example:
     * <section data-cursor-mode="shop">
     */

    var explicit =
      document.elementFromPoint(
        mouseX,
        mouseY
      );

    if (explicit) {

      var explicitSection =
        explicit.closest(
          '[data-cursor-mode]'
        );

      if (explicitSection) {

        var explicitMode =
          explicitSection.getAttribute(
            'data-cursor-mode'
          );

        if (
          explicitMode &&
          SECTION_PROFILES[explicitMode]
        ) {
          return {
            mode: explicitMode,
            element: explicitSection,
            profile:
              SECTION_PROFILES[explicitMode]
          };
        }
      }
    }


    /*
     * Fallback:
     * detect which homepage section occupies
     * the center of the viewport.
     */

    var candidates = [
      {
        selector:
          '#shopify-section-hero, [data-section-type="hero"]',
        mode: 'hero'
      },
      {
        selector:
          '#shopify-section-shop_by_pet, [data-section-type="shop-by-pet"]',
        mode: 'explore'
      },
      {
        selector:
          '#shopify-section-featured_products, [data-section-type="featured-products"]',
        mode: 'shop'
      },
      {
        selector:
          '#shopify-section-outfit_builder, [data-section-type="outfit-builder"]',
        mode: 'build'
      },
      {
        selector:
          '#shopify-section-lookbook_gallery, [data-section-type="lookbook-gallery"]',
        mode: 'discover'
      },
      {
        selector:
          '#shopify-section-lookbook, [data-section-type="lookbook"]',
        mode: 'discover'
      },
      {
        selector:
          '#shopify-section-care_ritual, [data-section-type="care-ritual"]',
        mode: 'calm'
      },
      {
        selector:
          '#shopify-section-blog_posts, [data-section-type="blog-posts"]',
        mode: 'read'
      },
      {
        selector:
          '#shopify-section-faq, [data-section-type="faq"]',
        mode: 'minimal'
      },
      {
        selector:
          '#shopify-section-testimonials, [data-section-type="testimonials"]',
        mode: 'minimal'
      },
      {
        selector:
          '#shopify-section-newsletter, [data-section-type="newsletter"]',
        mode: 'settle'
      }
    ];


    var centerY =
      window.innerHeight * 0.5;

    var best = null;
    var bestDistance = Infinity;


    for (
      var i = 0;
      i < candidates.length;
      i++
    ) {

      var nodes =
        document.querySelectorAll(
          candidates[i].selector
        );

      for (
        var j = 0;
        j < nodes.length;
        j++
      ) {

        var rect =
          nodes[j].getBoundingClientRect();

        if (
          rect.bottom < 0 ||
          rect.top > window.innerHeight
        ) {
          continue;
        }

        var sectionCenter =
          rect.top +
          rect.height / 2;

        var distance =
          Math.abs(
            centerY -
            sectionCenter
          );

        if (
          distance <
          bestDistance
        ) {
          bestDistance = distance;

          best = {
            mode:
              candidates[i].mode,

            element:
              nodes[j],

            profile:
              SECTION_PROFILES[
                candidates[i].mode
              ]
          };
        }
      }
    }


    if (best) {
      return best;
    }


    return {
      mode: 'hero',
      element: null,
      profile:
        SECTION_PROFILES.hero
    };
  }


  /* =========================================================
     APPLY SECTION
     ========================================================= */

  function updateSection() {

    var section =
      getSectionProfile();

    if (!section) {
      return;
    }


    if (
      section.mode ===
      currentSection &&
      section.element ===
      currentSectionElement
    ) {
      return;
    }


    currentSection =
      section.mode;

    currentSectionElement =
      section.element;


    /*
     * Reset the animation gently.
     * We don't force a visual snap.
     */

    idleTimer = 0;


    /*
     * Update CSS classes.
     * Useful for future styling and debugging.
     */

    document.body.setAttribute(
      'data-dog-cursor-section',
      currentSection
    );


    /*
     * Toy cycle timing is section-aware.
     */

    lastToySwitch =
      performance.now();


    /*
     * Calm sections should not suddenly
     * make the dog run.
     */

    if (
      currentSection === 'calm' ||
      currentSection === 'read' ||
      currentSection === 'minimal' ||
      currentSection === 'settle'
    ) {

      if (
        mode === 'run' &&
        nowHasBeenStill()
      ) {
        enterIdle();
      }
    }

  }


  function nowHasBeenStill() {
    return (
      performance.now() -
      lastMoveTime >
      getCurrentProfile().idleAfter
    );
  }


  function getCurrentProfile() {
    return (
      SECTION_PROFILES[currentSection] ||
      SECTION_PROFILES.hero
    );
  }


  /* =========================================================
     ANIMATION STATE
     ========================================================= */

  function enterRun() {

    if (mode === 'run') {
      return;
    }

    mode = 'run';

    idleTimer = 0;
    frameIndex = 0;
    frameTimer = 0;
  }


  function enterIdle() {

    if (mode !== 'run') {
      return;
    }

    mode = 'sniff';

    idleTimer = 0;
    frameIndex = 0;
    frameTimer = 0;
  }


  /* =========================================================
     INIT
     ========================================================= */

  function init() {

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
      function () {

        mouseX = -9999;
        mouseY = -9999;

        toyEl.classList.add(
          'is-hidden'
        );
      }
    );


    window.addEventListener(
      'mouseenter',
      function () {

        toyEl.classList.remove(
          'is-hidden'
        );
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


    requestAnimationFrame(
      loop
    );
  }


  /* =========================================================
     RESIZE
     ========================================================= */

  function resize() {

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


  /* =========================================================
     MOUSE
     ========================================================= */

  function onMove(e) {

    mouseX =
      e.clientX;

    mouseY =
      e.clientY;


    lastMoveTime =
      performance.now();


    toyEl.classList.remove(
      'is-hidden'
    );


    enterRun();


    updateSection();
  }


  /* =========================================================
     TOY
     ========================================================= */

  function switchToy() {

    toyIndex =
      (toyIndex + 1) %
      TOYS.length;


    toyEl.innerHTML =
      TOY_SVG[
        TOYS[toyIndex]
      ];


    lastToySwitch =
      performance.now();
  }


  /* =========================================================
     UPDATE
     ========================================================= */

  function update(
    dt,
    now
  ) {

    if (
      mouseX <
      -1000
    ) {
      return;
    }


    updateSection();


    var profile =
      getCurrentProfile();


    /*
     * Section-aware toy cycle.
     */

    if (
      now -
      lastToySwitch >
      profile.toyCycle
    ) {
      switchToy();
    }


    toyEl.style.transform =
      'translate(' +
      mouseX +
      'px,' +
      mouseY +
      'px)';


    /*
     * Section-aware idle timing.
     */

    var still =
      now -
      lastMoveTime >
      profile.idleAfter;


    if (
      still &&
      mode === 'run'
    ) {
      enterIdle();
    }


    /* =======================================================
       POSITION TARGET
       ======================================================= */

    var desiredBehindX =
      -profile.behindDistance;

    var desiredBehindY =
      profile.behindY;


    if (
      mode === 'run'
    ) {

      /*
       * While running, lag opposite
       * the direction of movement.
       */

      if (
        Math.abs(velX) >
        0.4
      ) {

        desiredBehindX =
          velX > 0
            ? -profile.behindDistance
            : profile.behindDistance;
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


      var targetX =
        mouseX +
        behindX;


      var targetY =
        mouseY +
        behindY;

    } else {

      /*
       * Idle:
       * place BODY so SNOUT meets
       * the toy.
       */

      var snoutReach =
        68 *
        DOG_SCALE;


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


      /*
       * Calm sections sit slightly
       * lower and farther away.
       */

      var idleYOffset =
        mode === 'sit'
          ? 18
          : profile.idleStyle === 'calm' ||
            profile.idleStyle === 'settle'
            ? 9
            : 6;


      targetY =
        mouseY +
        idleYOffset;


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
          idleYOffset -
          behindY
        ) *
        0.12;
    }


    /* =======================================================
       PHYSICS
       ======================================================= */

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
        ? profile.followStiffness * 1.7
        : profile.followStiffness;


    var damping =
      profile.damping;


    velX +=
      dx *
      stiffness;

    velY +=
      dy *
      stiffness;


    velX *=
      damping;

    velY *=
      damping;


    dogX +=
      velX;

    dogY +=
      velY;


    /* =======================================================
       FACING
       ======================================================= */

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
       * Always face the toy while idle.
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


    /* =======================================================
       ANIMATION
       ======================================================= */

    if (
      mode === 'run'
    ) {

      var speed =
        Math.hypot(
          velX,
          velY
        );


      /*
       * Calm/read/settle sections
       * deliberately have a slower run cycle.
       */

      var animationMultiplier =
        (
          profile.idleStyle === 'calm' ||
          profile.idleStyle === 'settle'
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
        animationMultiplier;


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

    } else {

      idleTimer +=
        dt;

      frameTimer +=
        dt *
        (
          profile.idleStyle === 'calm' ||
          profile.idleStyle === 'settle'
            ? 0.006
            : 0.01
        );


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


        /*
         * Calm sections hold the sniff
         * slightly longer.
         */

        var sniffDuration =
          (
            profile.idleStyle === 'calm' ||
            profile.idleStyle === 'settle'
          )
            ? 1300
            : 900;


        if (
          idleTimer >
          sniffDuration
        ) {

          mode = 'sit';

          idleTimer = 0;

          frameIndex = 0;
        }

      } else if (
        mode === 'sit'
      ) {

        frameIndex = 0;


        var sitDuration =
          (
            profile.idleStyle === 'settle'
          )
            ? 1300
            : (
                profile.idleStyle === 'calm'
                  ? 1100
                  : 700
              );


        if (
          idleTimer >
          sitDuration
        ) {

          /*
           * In calm/minimal/settle areas,
           * don't immediately chew.
           *
           * Instead remain sitting.
           */

          if (
            profile.idleStyle === 'calm' ||
            profile.idleStyle === 'settle'
          ) {

            mode = 'sit';

            idleTimer = 0;

          } else {

            mode = 'bite';

            idleTimer = 0;

            frameIndex = 0;
          }
        }

      } else if (
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
  }


  /* =========================================================
     DRAW DOT
     ========================================================= */

  function drawDot(
    x,
    y,
    r,
    a
  ) {

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      r,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      'rgba(0,0,0,' +
      a +
      ')';

    ctx.fill();
  }


  /* =========================================================
     DRAW DOG
     ========================================================= */

  function drawDog() {

    var set =
      FRAMES[
        mode
      ] ||
      FRAMES.run;


    var pts =
      set[
        frameIndex %
        set.length
      ] ||
      set[0];


    var dir =
      facing >= 0
        ? 1
        : -1;


    var profile =
      getCurrentProfile();


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
     * Dog dots.
     */

    for (
      var i = 0;
      i < pts.length;
      i++
    ) {

      var x =
        dogX +
        pts[i][0] *
        scale *
        dir;


      var y =
        dogY +
        pts[i][1] *
        scale;


      drawDot(
        x,
        y,
        (
          1.55 +
          (i % 3) *
          0.3
        ) *
        profile.scale,
        0.92
      );
    }


    /*
     * Food crumbs.
     *
     * Only during bite mode.
     */

    if (
      mode === 'bite'
    ) {

      var sx =
        dogX +
        dir *
        52 *
        scale *
        0.78;


      var sy =
        dogY +
        2;


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


  /* =========================================================
     RENDER
     ========================================================= */

  function render() {

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    if (
      mouseX <
      -1000
    ) {
      return;
    }


    drawDog();
  }


  /* =========================================================
     LOOP
     ========================================================= */

  function loop(time) {

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


    requestAnimationFrame(
      loop
    );
  }


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();
  }

})();