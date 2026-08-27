/**
 * PETLIO -- HERO YARD (scroll-pinned copy)
 * ============================================================
 * A small scripted scene above the footer, using its top edge as
 * "ground." Now includes a playable ball and a food plate:
 *
 * - Ball: real physics (gravity, ground bounce, rolling friction).
 *   Hover past it to bump it, or press-drag-release to fling it --
 *   release velocity comes from your actual pointer movement.
 * - Dog: fetches the ball whenever it's moving/airborne (overrides
 *   its normal patrol), catches it, noses it, then reverts.
 * - Cat / rabbit / bird: each follows the same priority order --
 *   flee from the dog (direction-aware, always wins) > walk to the
 *   plate and eat for a few seconds (one at a time) > ambient
 *   wander. Bird flees by moving away horizontally AND climbing,
 *   at the same time.
 * - Butterfly: unchanged, purely ambient, not part of this system.
 *
 * Reuses existing SVG part classes/keyframes from dog-cursor.css,
 * scroll-cat.css and scroll-bird.css wherever the pose fits (e.g.
 * "eating" reuses the existing sit/idle/perch poses -- no bespoke
 * chewing/pecking animation was added, to keep this file's weight
 * down).
 *
 * Mouse listeners for the ball are only bound while the footer is
 * near the viewport (same IntersectionObserver gate as before), and
 * removed the moment it scrolls away -- zero cost anywhere else on
 * the page. Loop still fully bails on prefers-reduced-motion / narrow
 * screens.
 */

(function () {
  'use strict';

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var isNarrow =
    window.matchMedia && window.matchMedia('(max-width: 900px)').matches;

  if (reduceMotion || isNarrow) {
    return;
  }

  var DOG_SVG =
    '<svg viewBox="0 0 130 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="dogFurYard" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#c9812f"/><stop offset="45%" stop-color="#e2a35c"/>' +
    '<stop offset="100%" stop-color="#f6dfb0"/></linearGradient></defs>' +
    '<ellipse cx="58" cy="57" rx="30" ry="4.5" fill="rgba(60,40,20,0.16)"/>' +
    '<g class="dog-cursor__tail"><path d="M30 38C18 30 8 18 12 10C18 14 24 22 30 30C34 26 34 20 30 14C38 20 40 30 34 38Z" fill="url(#dogFurYard)"/></g>' +
    '<g class="dog-cursor__legs-back">' +
    '<path d="M30.4 50.6A2.6 2.6 0 0 1 35.6 50.6L35.6 55.4A2.6 2.6 0 0 1 30.4 55.4Z" fill="#8a5a2e"/>' +
    '<path d="M36.4 50.6A2.6 2.6 0 0 1 41.6 50.6L41.6 55.4A2.6 2.6 0 0 1 36.4 55.4Z" fill="#c98a4a"/></g>' +
    '<g class="dog-cursor__body">' +
    '<ellipse cx="56" cy="40" rx="28" ry="18" fill="url(#dogFurYard)"/>' +
    '<ellipse cx="52" cy="50" rx="20" ry="10" fill="#faeccb" opacity="0.65"/></g>' +
    '<g class="dog-cursor__legs-front">' +
    '<path d="M66.4 48.6A2.6 2.6 0 0 1 71.6 48.6L71.6 55.4A2.6 2.6 0 0 1 66.4 55.4Z" fill="#8a5a2e"/>' +
    '<path d="M74.4 48.6A2.6 2.6 0 0 1 79.6 48.6L79.6 55.4A2.6 2.6 0 0 1 74.4 55.4Z" fill="#c98a4a"/></g>' +
    '<g class="dog-cursor__head">' +
    '<path d="M84 16C76 10 70 14 70 24C70 34 78 37 84 31C80 27 78 21 84 16Z" fill="#8a5a2e"/>' +
    '<circle cx="94" cy="27" r="15" fill="url(#dogFurYard)"/>' +
    '<path d="M90 33C100 32 112 31 118 34C112 39 100 41 92 40Z" fill="#e7bd85"/>' +
    '<ellipse cx="116" cy="34" rx="3" ry="2.3" fill="#3b2417"/>' +
    '<circle cx="97" cy="24" r="2.3" fill="#241408"/>' +
    '<circle cx="97.8" cy="23.2" r="0.7" fill="#fff6df"/>' +
    '<path class="dog-cursor__mouth-closed" d="M92 40C97 42.5 104 42.5 109 40" stroke="#5c3a1c" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
    '</g></svg>';

  var CAT_SVG =
    '<svg viewBox="0 0 130 58" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="catFurYard" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#d97b3a"/><stop offset="45%" stop-color="#eb9c55"/>' +
    '<stop offset="100%" stop-color="#f8dfc0"/></linearGradient></defs>' +
    '<ellipse cx="58" cy="53" rx="26" ry="4" fill="rgba(60,40,10,0.14)"/>' +
    '<g class="scroll-cat__tail"><path d="M28 40C16 44 6 40 4 30C10 34 18 38 24 34C20 28 17 23 21 17C26 22 29 32 28 40Z" fill="url(#catFurYard)"/></g>' +
    '<g class="scroll-cat__legs-back">' +
    '<path d="M30 46.5A2.5 2.5 0 0 1 35 46.5L35 51.5A2.5 2.5 0 0 1 30 51.5Z" fill="#c56a2c"/>' +
    '<path d="M36 46.5A2.5 2.5 0 0 1 41 46.5L41 51.5A2.5 2.5 0 0 1 36 51.5Z" fill="#e08c46"/></g>' +
    '<g class="scroll-cat__body">' +
    '<ellipse cx="54" cy="36" rx="24" ry="14" fill="url(#catFurYard)"/>' +
    '<ellipse cx="50" cy="44" rx="16" ry="8" fill="#faeccb" opacity="0.6"/></g>' +
    '<g class="scroll-cat__legs-front">' +
    '<path d="M64 44.5A2.5 2.5 0 0 1 69 44.5L69 51.5A2.5 2.5 0 0 1 64 51.5Z" fill="#c56a2c"/>' +
    '<path d="M72 44.5A2.5 2.5 0 0 1 77 44.5L77 51.5A2.5 2.5 0 0 1 72 51.5Z" fill="#e08c46"/></g>' +
    '<g class="scroll-cat__head">' +
    '<g class="scroll-cat__ears">' +
    '<path d="M80 15L74 3L88 12Z" fill="url(#catFurYard)"/>' +
    '<path d="M100 15L106 3L92 12Z" fill="url(#catFurYard)"/></g>' +
    '<circle cx="90" cy="24" r="12" fill="url(#catFurYard)"/>' +
    '<path d="M84 29C92 28 102 27 108 30C102 34 92 36 86 35Z" fill="#f3e6cf"/>' +
    '<ellipse cx="106" cy="30" rx="2" ry="1.6" fill="#e8879a"/>' +
    '<ellipse cx="94" cy="21" rx="2.6" ry="2.2" fill="#c98a35"/>' +
    '<ellipse cx="94" cy="21" rx="0.6" ry="1.8" fill="#1a1a1a"/>' +
    '</g></svg>';

  var BIRD_SVG =
    '<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="phoenixBodyYard" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#ffd98a"/><stop offset="45%" stop-color="#ff8a3d"/>' +
    '<stop offset="100%" stop-color="#c8412a"/></linearGradient>' +
    '<linearGradient id="phoenixWingYard" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#ffe28a"/><stop offset="50%" stop-color="#ff9a3c"/>' +
    '<stop offset="100%" stop-color="#e2432a"/></linearGradient>' +
    '<linearGradient id="phoenixTailYard" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#fff1b8"/><stop offset="40%" stop-color="#ffb14d"/>' +
    '<stop offset="75%" stop-color="#ff6a3d"/><stop offset="100%" stop-color="#c8302a"/></linearGradient>' +
    '<radialGradient id="phoenixGlowYard" cx="50%" cy="50%" r="50%">' +
    '<stop offset="0%" stop-color="#ffdd8a" stop-opacity="0.85"/>' +
    '<stop offset="60%" stop-color="#ff9a3c" stop-opacity="0.3"/>' +
    '<stop offset="100%" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    '<ellipse class="scroll-bird__aura" cx="30" cy="27" rx="27" ry="23" fill="url(#phoenixGlowYard)"/>' +
    '<g class="scroll-bird__tail"><path d="M22 30 C10 34 2 44 4 52 C10 48 16 42 22 34 Z" fill="url(#phoenixTailYard)"/></g>' +
    '<g class="scroll-bird__body">' +
    '<ellipse cx="30" cy="30" rx="15" ry="10" fill="url(#phoenixBodyYard)"/>' +
    '<circle cx="42" cy="22" r="9" fill="url(#phoenixBodyYard)"/>' +
    '<circle cx="46" cy="20" r="2" fill="#2a1810"/>' +
    '<path d="M50 22 L59 23.3 L50 25.4 Z" fill="#ffb63d"/></g>' +
    '<g class="scroll-bird__wing">' +
    '<path d="M22 26 C10 16 4 6 12 4 C20 2 30 12 34 22 C31 27 26 29 22 26 Z" fill="url(#phoenixWingYard)"/></g>' +
    '</svg>';

  var RABBIT_SVG =
    '<svg viewBox="0 0 80 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="rabbitFurYard" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#c9b8a8"/><stop offset="45%" stop-color="#e4d5c3"/>' +
    '<stop offset="100%" stop-color="#f8f0e4"/></linearGradient></defs>' +
    '<ellipse cx="38" cy="49" rx="20" ry="3" fill="rgba(60,40,20,0.13)"/>' +
    '<g class="hero-yard__rabbit-ears">' +
    '<path d="M28 20C24 8 26 -2 32 0C36 2 36 14 34 22Z" fill="url(#rabbitFurYard)"/>' +
    '<path d="M30 18C28 9 29 2 32 3C34 5 34 13 33 19Z" fill="#f6c9c9"/>' +
    '<path d="M40 20C40 8 40 -2 46 1C49 4 47 14 44 22Z" fill="url(#rabbitFurYard)"/>' +
    '<path d="M41 18C41 9 41 3 44 5C46 7 45 14 43 19Z" fill="#f6c9c9"/>' +
    '</g>' +
    '<circle class="hero-yard__rabbit-tail" cx="14" cy="38" r="6" fill="#faf4ea"/>' +
    '<ellipse cx="38" cy="34" rx="18" ry="13" fill="url(#rabbitFurYard)"/>' +
    '<ellipse cx="34" cy="40" rx="12" ry="6" fill="#faf1e4" opacity="0.7"/>' +
    '<ellipse cx="20" cy="46" rx="6" ry="3" fill="#8a5a2e" opacity="0.55"/>' +
    '<ellipse cx="52" cy="46" rx="6" ry="3" fill="#8a5a2e" opacity="0.55"/>' +
    '<g class="hero-yard__rabbit-head">' +
    '<circle cx="46" cy="27" r="2" fill="#2a1810"/>' +
    '<circle cx="46.6" cy="26.2" r="0.6" fill="#fff6df"/>' +
    '<ellipse cx="52" cy="31" rx="2" ry="1.4" fill="#e8879a"/>' +
    '</g>' +
    '</svg>';

  var BUTTERFLY_SVG =
    '<svg viewBox="0 0 46 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="butterflyWingYard" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#f6c9c9"/><stop offset="55%" stop-color="#e8879a"/>' +
    '<stop offset="100%" stop-color="#c96a86"/></linearGradient></defs>' +
    '<g class="hero-yard__wing-left">' +
    '<path d="M22 16C10 4 0 4 2 14C4 22 14 24 22 18Z" fill="url(#butterflyWingYard)"/>' +
    '<path d="M22 20C12 22 4 28 6 32C8 35 16 30 22 24Z" fill="url(#butterflyWingYard)" opacity="0.85"/>' +
    '</g>' +
    '<g class="hero-yard__wing-right">' +
    '<path d="M24 16C36 4 46 4 44 14C42 22 32 24 24 18Z" fill="url(#butterflyWingYard)"/>' +
    '<path d="M24 20C34 22 42 28 40 32C38 35 30 30 24 24Z" fill="url(#butterflyWingYard)" opacity="0.85"/>' +
    '</g>' +
    '<ellipse cx="23" cy="19" rx="2" ry="8" fill="#5c3a4a"/>' +
    '<path d="M22 12C20 9 18 7 16 6M24 12C26 9 28 7 30 6" stroke="#5c3a4a" stroke-width="0.9" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  var BALL_SVG =
    '<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><radialGradient id="ballShadeYard" cx="35%" cy="30%" r="75%">' +
    '<stop offset="0%" stop-color="#fff3d6"/><stop offset="55%" stop-color="#ffb64d"/>' +
    '<stop offset="100%" stop-color="#e07a2c"/></radialGradient></defs>' +
    '<circle cx="15" cy="15" r="13" fill="url(#ballShadeYard)"/>' +
    '<path d="M3 15C8 10 22 10 27 15" stroke="#c8571f" stroke-width="2" fill="none" opacity="0.55"/>' +
    '<path d="M3 15C8 20 22 20 27 15" stroke="#c8571f" stroke-width="2" fill="none" opacity="0.4"/>' +
    '<ellipse cx="11" cy="10" rx="4" ry="2.4" fill="#fff6e0" opacity="0.55"/>' +
    '</svg>';

  var PLATE_SVG =
    '<svg viewBox="0 0 60 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<ellipse cx="30" cy="18" rx="28" ry="7" fill="rgba(60,40,20,0.12)"/>' +
    '<ellipse cx="30" cy="14" rx="26" ry="8" fill="#f4ede0"/>' +
    '<ellipse cx="30" cy="13" rx="20" ry="5.6" fill="#e7dcc8"/>' +
    '<circle cx="22" cy="12" r="2.4" fill="#b5793a"/>' +
    '<circle cx="30" cy="10.5" r="2.6" fill="#c98a4a"/>' +
    '<circle cx="38" cy="12.5" r="2.2" fill="#a8672e"/>' +
    '<circle cx="27" cy="14.5" r="2" fill="#c98a4a"/>' +
    '<circle cx="34" cy="15" r="2.1" fill="#b5793a"/>' +
    '</svg>';

  var WATER_BOWL_SVG =
    '<svg viewBox="0 0 46 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
    '<defs><radialGradient id="waterShineYard" cx="35%" cy="30%" r="70%">' +
    '<stop offset="0%" stop-color="#e6f7ff"/><stop offset="60%" stop-color="#8fd0e8"/>' +
    '<stop offset="100%" stop-color="#4a9fc2"/></radialGradient></defs>' +
    '<ellipse cx="23" cy="17" rx="21" ry="6" fill="rgba(60,40,20,0.12)"/>' +
    '<ellipse cx="23" cy="13" rx="19" ry="7" fill="#c9d6dc"/>' +
    '<ellipse cx="23" cy="12" rx="14.5" ry="5" fill="url(#waterShineYard)"/>' +
    '<ellipse cx="18" cy="10" rx="4" ry="1.4" fill="#f2fbff" opacity="0.6"/>' +
    '</svg>';

  function mount() {
    if (document.getElementById('hero-yard')) return;

    // Mounts into the sticky slot rendered by sections/hero-yard.liquid --
    // does NOT touch the real #footer-yard or its section at all.
    var stickyEl = document.getElementById('hero-yard-sticky');
    if (!stickyEl) return;

    var yard = document.createElement('div');
    yard.id = 'hero-yard';
    yard.setAttribute('aria-hidden', 'true');
    yard.innerHTML =
      '<div class="hero-yard__weather">' +
      '<div class="hero-yard__sky"></div>' +
      '<div class="hero-yard__sun"></div>' +
      '<div class="hero-yard__cloud c1"></div>' +
      '<div class="hero-yard__cloud c2"></div>' +
      '<div class="hero-yard__cloud c3"></div>' +
      '<div class="hero-yard__rain"></div>' +
      '<div class="hero-yard__lightning"></div>' +
      '<div class="hero-yard__leaf" data-leaf="0"></div>' +
      '<div class="hero-yard__leaf" data-leaf="1"></div>' +
      '<div class="hero-yard__leaf" data-leaf="2"></div>' +
      '<div class="hero-yard__leaf" data-leaf="3"></div>' +
      '<div class="hero-yard__leaf" data-leaf="4"></div>' +
      '<div class="hero-yard__leaf" data-leaf="5"></div>' +
      '</div>' +
      '<div class="hero-yard__ground"></div>' +
      '<div class="hero-yard__plate">' +
      PLATE_SVG +
      '</div>' +
      '<div class="hero-yard__water-bowl">' +
      WATER_BOWL_SVG +
      '</div>' +
      '<div class="hero-yard__dog" data-dog-mode="run">' +
      DOG_SVG +
      '</div>' +
      '<div class="hero-yard__cat is-running">' +
      CAT_SVG +
      '</div>' +
      '<div class="hero-yard__bird">' +
      BIRD_SVG +
      '</div>' +
      '<div class="hero-yard__rabbit">' +
      RABBIT_SVG +
      '</div>' +
      '<div class="hero-yard__butterfly">' +
      BUTTERFLY_SVG +
      '</div>' +
      '<div class="hero-yard__ball">' +
      BALL_SVG +
      '</div>';

    stickyEl.appendChild(yard);
    start(yard);
    startWeather(stickyEl);
    startMergeWatch(stickyEl);
  }

  /* ================================================================
     WEATHER -- purely a function of scroll progress through the tall
     .hero-yard-wrap. Never touches the critter engine below; reads
     nothing from it either. Reversible by construction: scrolling up
     simply decreases `progress`, which un-plays every step here.
     ================================================================ */
  function startWeather(stickyEl) {
    var wrap = document.getElementById('hero-yard-wrap');
    var weatherEl = stickyEl.querySelector('.hero-yard__weather');
    if (!wrap || !weatherEl) return;

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var skyEl = weatherEl.querySelector('.hero-yard__sky');
    var sunEl = weatherEl.querySelector('.hero-yard__sun');
    var cloudEls = [].slice.call(weatherEl.querySelectorAll('.hero-yard__cloud'));
    var rainEl = weatherEl.querySelector('.hero-yard__rain');
    var lightningEl = weatherEl.querySelector('.hero-yard__lightning');
    var leafEls = [].slice.call(weatherEl.querySelectorAll('.hero-yard__leaf'));

    for (var i = 0; i < 26; i++) {
      var streak = document.createElement('span');
      streak.style.left = Math.random() * 100 + '%';
      streak.style.animationDelay = Math.random() * 0.7 + 's';
      streak.style.opacity = (0.4 + Math.random() * 0.5).toFixed(2);
      rainEl.appendChild(streak);
    }

    var SKY_STOPS = ['F5EFE3', 'E4DECE', 'B9C0C4', '5A6570'];
    function lerpColor(a, b, t) {
      var ah = a.match(/\w\w/g).map(function (x) { return parseInt(x, 16); });
      var bh = b.match(/\w\w/g).map(function (x) { return parseInt(x, 16); });
      var rgb = ah.map(function (c, idx) { return Math.round(c + (bh[idx] - c) * t); });
      return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    }
    function map(v, inMin, inMax, outMin, outMax) {
      var t = Math.min(1, Math.max(0, (v - inMin) / (inMax - inMin)));
      return outMin + t * (outMax - outMin);
    }

    var leafConfig = [
      { left: 0.10, start: 0.15, end: 0.55, size: 14, spin: 260 },
      { left: 0.30, start: 0.22, end: 0.62, size: 18, spin: 340 },
      { left: 0.55, start: 0.30, end: 0.72, size: 12, spin: 200 },
      { left: 0.70, start: 0.55, end: 0.85, size: 16, spin: 300 },
      { left: 0.85, start: 0.60, end: 0.92, size: 14, spin: 240 },
      { left: 0.45, start: 0.65, end: 0.98, size: 20, spin: 360 }
    ];

    function updateWeather(progress) {
      var bandT = progress * 3;
      var bi = Math.min(2, Math.floor(bandT));
      skyEl.style.background = lerpColor(SKY_STOPS[bi], SKY_STOPS[bi + 1], bandT - bi);

      var sunX = map(progress, 0, 1, 8, 78);
      var sunY = map(progress, 0, 1, 10, 45) - Math.sin(progress * Math.PI) * 20;
      sunEl.style.transform = 'translate(' + sunX + '%, ' + sunY + '%)';
      sunEl.style.opacity = 1 - map(progress, 0.25, 0.42, 0, 1);

      cloudEls.forEach(function (c, idx) {
        var cOpacity = map(progress, 0.28 + idx * 0.04, 0.55 + idx * 0.04, 0, 0.9);
        var cx = map(progress, 0.2, 0.9, -30 + idx * 8, 70 - idx * 6);
        c.style.opacity = cOpacity.toFixed(2);
        c.style.transform = 'translate(' + cx + '%, ' + idx * 4 + '%)';
      });

      rainEl.style.opacity = map(progress, 0.55, 0.72, 0, 0.85).toFixed(2);

      if (progress > 0.78) {
        var local = map(progress, 0.78, 1, 0, 1);
        var wave = Math.abs(Math.sin(local * Math.PI * 6));
        lightningEl.style.opacity = (wave > 0.93 ? (wave - 0.93) * 8 : 0).toFixed(2);
      } else {
        lightningEl.style.opacity = 0;
      }

      leafEls.forEach(function (leaf, idx) {
        var cfg = leafConfig[idx];
        var t = map(progress, cfg.start, cfg.end, 0, 1);
        var fallY = map(t, 0, 1, -10, 115);
        var wind = progress > 0.6 ? 10 : 5;
        var drift = Math.sin(t * Math.PI * 2) * wind;
        var rotate = t * cfg.spin * (progress > 0.6 ? 1.6 : 1);
        var opacity = progress < cfg.start || progress > cfg.end ? 0 : Math.sin(t * Math.PI);
        leaf.style.width = leaf.style.height = cfg.size + 'px';
        leaf.style.left = cfg.left * 100 + '%';
        leaf.style.transform = 'translate(' + drift + 'px, ' + fallY + '%) rotate(' + rotate + 'deg)';
        leaf.style.opacity = opacity.toFixed(2);
      });
    }

    function onScroll() {
      var rect = wrap.getBoundingClientRect();
      var total = wrap.offsetHeight - window.innerHeight;
      var scrolled = -rect.top;
      var progress = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
      updateWeather(progress);
    }

    if (reduceMotion) {
      updateWeather(0.15);
      return;
    }

    var ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          requestAnimationFrame(function () {
            onScroll();
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ================================================================
     MERGE -- watches the REAL #footer-yard (untouched, unmodified)
     and fades this sticky copy out right as it comes into view, so
     the two read as one continuous yard. Purely additive: only reads
     the existing element, never writes to it.
     ================================================================ */
  function startMergeWatch(stickyEl) {
    var realFooterYard = document.getElementById('footer-yard');
    if (!realFooterYard || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          stickyEl.style.opacity = entry.isIntersecting ? '0' : '1';
        });
      },
      { rootMargin: '-10% 0px -60% 0px' }
    );
    io.observe(realFooterYard);
  }

  function start(yard) {
    var dogEl = yard.querySelector('.hero-yard__dog');
    var catEl = yard.querySelector('.hero-yard__cat');
    var birdEl = yard.querySelector('.hero-yard__bird');
    var rabbitEl = yard.querySelector('.hero-yard__rabbit');
    var butterflyEl = yard.querySelector('.hero-yard__butterfly');
    var ballEl = yard.querySelector('.hero-yard__ball');
    var plateEl = yard.querySelector('.hero-yard__plate');
    var waterBowlEl = yard.querySelector('.hero-yard__water-bowl');

    var GROUND_ANCHOR = 20; // px, matches CSS bottom offset shared by ground-walkers
    var PLATE_HALF_WIDTH = 23; // half of the plate's 46px CSS width
    var WATER_OFFSET = 42; // px to the right of the food plate
    var WATER_HALF_WIDTH = 18; // half of the water bowl's 36px CSS width
    var width = yard.offsetWidth;

    var plateX = width * 0.5;
    var waterX = plateX + WATER_OFFSET;
    var plateOccupant = null; // null | 'cat' | 'rabbit' | 'bird' | 'dog'
    var waterOccupant = null; // null | 'bird' | 'butterfly'

    function positionPlate() {
      plateX = width * 0.5;
      waterX = plateX + WATER_OFFSET;
      plateEl.style.transform =
        'translate3d(' + (plateX - PLATE_HALF_WIDTH).toFixed(1) + 'px,0,0)';
      waterBowlEl.style.transform =
        'translate3d(' + (waterX - WATER_HALF_WIDTH).toFixed(1) + 'px,0,0)';
    }
    positionPlate();

    /* ---------------- BALL ---------------- */
    var GRAVITY = 1500; // px/s^2
    var BOUNCE_DAMP = 0.42;
    var GROUND_FRICTION = 2.6; // 1/s decay rate while rolling
    var BALL_RADIUS = 13;
    var ball = {
      x: width * 0.25,
      h: 0, // height above ground, px
      vx: 0,
      vy: 0,
      rot: 0,
      held: false
    };
    var pointerHistory = []; // {x,y,t} in yard-local coords, last ~120ms while dragging
    var lastPointerLocal = null; // {x,y,t} updated on every yard mousemove, for bump velocity

    function isBallActive() {
      return !ball.held && (ball.h > 2 || Math.abs(ball.vx) > 8);
    }

    function toLocal(clientX, clientY) {
      var rect = yard.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: rect.bottom - GROUND_ANCHOR - clientY, // height above ground line
        t: performance.now()
      };
    }

    function onBallMouseEnter() {
      if (ball.held || isBallActive()) return;
      if (!lastPointerLocal) return;
      var now = performance.now();
      if (now - lastPointerLocal.t > 120) return; // stale sample, no real motion
      var vx = lastPointerLocal.vx || 0;
      ball.vx = Math.max(-260, Math.min(260, vx * 0.9));
      ball.vy = 150 + Math.random() * 60;
    }

    function onBallMouseDown(e) {
      ball.held = true;
      ball.vx = 0;
      ball.vy = 0;
      pointerHistory = [];
      ballEl.classList.add('is-held');
      e.preventDefault();
    }

    function onYardMouseMove(e) {
      var local = toLocal(e.clientX, e.clientY);
      if (lastPointerLocal) {
        var dt = (local.t - lastPointerLocal.t) / 1000;
        if (dt > 0.001) {
          local.vx = (local.x - lastPointerLocal.x) / dt;
          local.vy = (local.y - lastPointerLocal.y) / dt;
        }
      }
      lastPointerLocal = local;

      if (ball.held) {
        ball.x = Math.max(0, Math.min(width, local.x));
        ball.h = Math.max(0, Math.min(90, local.y));
        pointerHistory.push(local);
        if (pointerHistory.length > 6) pointerHistory.shift();
      }
    }

    function onWindowMouseUp() {
      if (!ball.held) return;
      ball.held = false;
      ballEl.classList.remove('is-held');

      if (pointerHistory.length >= 2) {
        var first = pointerHistory[0];
        var last = pointerHistory[pointerHistory.length - 1];
        var dt = (last.t - first.t) / 1000;
        if (dt > 0.01) {
          ball.vx = Math.max(-420, Math.min(420, (last.x - first.x) / dt));
          ball.vy = Math.max(-420, Math.min(520, (last.y - first.y) / dt));
        }
      }
    }

    var pointerListenersBound = false;
    function bindPointerListeners() {
      if (pointerListenersBound) return;
      pointerListenersBound = true;
      ballEl.addEventListener('mouseenter', onBallMouseEnter);
      ballEl.addEventListener('mousedown', onBallMouseDown);
      window.addEventListener('mousemove', onYardMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
    }
    function unbindPointerListeners() {
      if (!pointerListenersBound) return;
      pointerListenersBound = false;
      ballEl.removeEventListener('mouseenter', onBallMouseEnter);
      ballEl.removeEventListener('mousedown', onBallMouseDown);
      window.removeEventListener('mousemove', onYardMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    }

    function stepBall(dt) {
      if (ball.held) return;

      ball.h += ball.vy * dt;
      ball.vy -= GRAVITY * dt;
      ball.x += ball.vx * dt;

      if (ball.h <= 0) {
        ball.h = 0;
        if (ball.vy < -30) {
          ball.vy = -ball.vy * BOUNCE_DAMP;
        } else {
          ball.vy = 0;
        }
        var decay = Math.max(0, 1 - GROUND_FRICTION * dt);
        ball.vx *= decay;
        if (Math.abs(ball.vx) < 4) ball.vx = 0;
      }

      if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx) * 0.5;
      } else if (ball.x > width - BALL_RADIUS) {
        ball.x = width - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * 0.5;
      }

      ball.rot += ball.vx * dt * 2.4;

      ballEl.style.transform =
        'translate3d(' +
        (ball.x - BALL_RADIUS).toFixed(1) +
        'px,' +
        (-ball.h).toFixed(1) +
        'px,0) rotate(' +
        (ball.rot % 360).toFixed(1) +
        'deg)';
    }

    /* ---------------- DOG ---------------- */
    var DOG_PATROL_SPEED = 34;
    var DOG_FETCH_SPEED = 92;
    var CATCH_RADIUS = 20;
    var BITE_DURATION = 480;

    var dogX = -80;
    var dogFacing = 1; // 1 = artwork's native right-facing orientation, -1 = flipped
    var dogMode = 'patrol'; // patrol | fetch | bite | to-plate | eating
    var dogPatrolState = 'run'; // run | sit (sub-state of patrol)
    var dogTimer = 0;
    var dogSitFor = 0;
    var dogBiteTimer = 0;
    var dogEatFor = 0;

    function setDogVisual(m) {
      if (dogEl.getAttribute('data-dog-mode') !== m) {
        dogEl.setAttribute('data-dog-mode', m);
      }
    }

    function stepDog(dt) {
      dogTimer += dt * 1000;

      if (dogMode === 'bite') {
        dogBiteTimer += dt * 1000;
        setDogVisual('bite');
        if (dogBiteTimer > BITE_DURATION) {
          ball.vx = (Math.random() * 2 - 1) * 70;
          ball.vy = 90;
          dogMode = 'patrol';
          dogPatrolState = 'run';
          dogTimer = 0;
        }
      } else if (isBallActive() || dogMode === 'fetch') {
        if (dogMode === 'to-plate' || dogMode === 'eating') {
          if (plateOccupant === 'dog') plateOccupant = null;
          dogEl.classList.remove('is-eating');
        }
        dogMode = 'fetch';
        setDogVisual('run');
        var dir = ball.x > dogX ? 1 : -1;
        dogFacing = dir;
        dogX += dir * DOG_FETCH_SPEED * dt;

        if (
          Math.abs(dogX - ball.x) < CATCH_RADIUS &&
          ball.h < 6 &&
          !ball.held
        ) {
          dogMode = 'bite';
          dogBiteTimer = 0;
        }
      } else if (dogMode === 'to-plate') {
        var toPlateD = plateX - dogX;
        if (Math.abs(toPlateD) < 4) {
          dogMode = 'eating';
          dogTimer = 0;
          dogEatFor = 3000 + Math.random() * 2000;
          setDogVisual('sit');
          dogEl.classList.add('is-eating');
        } else {
          dogFacing = toPlateD >= 0 ? 1 : -1;
          dogX += Math.sign(toPlateD) * DOG_PATROL_SPEED * 1.3 * dt;
          setDogVisual('run');
        }
      } else if (dogMode === 'eating') {
        if (dogTimer > dogEatFor) {
          plateOccupant = null;
          dogEl.classList.remove('is-eating');
          dogMode = 'patrol';
          dogPatrolState = 'run';
          dogTimer = 0;
        }
      } else {
        /* patrol */
        if (dogPatrolState === 'run') {
          dogX += DOG_PATROL_SPEED * dt;
          dogFacing = 1;
          if (dogX > width + 80) dogX = -80;
          setDogVisual('run');
          if (dogTimer > 4500 + Math.random() * 2500) {
            if (!plateOccupant && Math.random() < 0.3) {
              plateOccupant = 'dog';
              dogMode = 'to-plate';
              dogTimer = 0;
            } else {
              dogPatrolState = 'sit';
              dogTimer = 0;
              dogSitFor = 1200 + Math.random() * 1000;
              setDogVisual('sit');
            }
          }
        } else if (dogPatrolState === 'sit') {
          if (dogTimer > dogSitFor) {
            dogPatrolState = 'run';
            dogTimer = 0;
            setDogVisual('run');
          }
        }
      }

      dogX = Math.max(-80, Math.min(width + 80, dogX));
      dogEl.style.transform =
        'translate3d(' +
        dogX.toFixed(1) +
        'px,0,0) scaleX(' +
        dogFacing +
        ')';
    }

    /* ---------------- CAT ---------------- */
    var CAT_SPEED = 24;
    var CAT_FLEE_SPEED = 105;
    var CAT_FLEE_RADIUS = 85;
    var CAT_PLATE_X_OFFSET = -10;

    var catX = width * 0.4;
    var catFacing = 1;
    var catState = 'walk'; // walk | to-plate | eating | startled | fleeing
    var catTimer = 0;
    var catEatFor = 0;

    function setCatVisual(s) {
      var cls =
        s === 'eating'
          ? 'is-sitting is-eating'
          : s === 'startled'
          ? 'is-startled'
          : 'is-running';
      catEl.className = 'hero-yard__cat ' + cls;
    }

    function stepCat(dt) {
      catTimer += dt * 1000;
      var distToDog = Math.abs(catX - dogX);

      if (catState !== 'startled' && catState !== 'fleeing' && distToDog < CAT_FLEE_RADIUS) {
        if (plateOccupant === 'cat') plateOccupant = null;
        catState = 'startled';
        catTimer = 0;
        setCatVisual('startled');
      } else if (catState === 'startled') {
        if (catTimer > 180) {
          catState = 'fleeing';
          catTimer = 0;
          setCatVisual('walk');
        }
      } else if (catState === 'fleeing') {
        var fleeDir = catX >= dogX ? 1 : -1;
        catFacing = fleeDir;
        catX += fleeDir * CAT_FLEE_SPEED * dt;
        catX = Math.max(-60, Math.min(width + 60, catX));
        if (catTimer > 700 && distToDog > CAT_FLEE_RADIUS + 40) {
          catState = 'walk';
          catTimer = 0;
        }
      } else if (catState === 'walk') {
        catFacing = 1;
        catX += CAT_SPEED * dt;
        if (catX > width + 60) catX = -60;
        if (!plateOccupant && catTimer > 4500 + Math.random() * 2500) {
          plateOccupant = 'cat';
          catState = 'to-plate';
          catTimer = 0;
        }
      } else if (catState === 'to-plate') {
        var targetX = plateX + CAT_PLATE_X_OFFSET;
        var d = targetX - catX;
        if (Math.abs(d) < 4) {
          catState = 'eating';
          catTimer = 0;
          catEatFor = 3200 + Math.random() * 1800;
          setCatVisual('eating');
        } else {
          catFacing = d >= 0 ? 1 : -1;
          catX += Math.sign(d) * CAT_SPEED * 1.3 * dt;
          setCatVisual('walk');
        }
      } else if (catState === 'eating') {
        if (catTimer > catEatFor) {
          plateOccupant = null;
          catState = 'walk';
          catTimer = 0;
          setCatVisual('walk');
        }
      }

      catEl.style.transform =
        'translate3d(' + catX.toFixed(1) + 'px,0,0) scaleX(' + catFacing + ')';
    }

    /* ---------------- RABBIT ---------------- */
    var RABBIT_HOP_DISTANCE = 44;
    var RABBIT_FLEE_HOP_DISTANCE = 70;
    var RABBIT_HOP_DURATION = 260;
    var RABBIT_HOP_HEIGHT = 15;
    var RABBIT_FLEE_RADIUS = 70;
    var RABBIT_PLATE_X_OFFSET = 14;

    var rabbitX = width * 0.75;
    var rabbitFacing = 1;
    var rabbitState = 'idle'; // idle | hopping | to-plate | eating | fleeing
    var rabbitTimer = 0;
    var rabbitGap = 700 + Math.random() * 900;
    var rabbitEatFor = 0;
    var rabbitHopStartX = rabbitX;
    var rabbitHopDist = RABBIT_HOP_DISTANCE;
    var rabbitHopTargetState = 'idle'; // state to enter once the current hop lands

    function setRabbitVisual(s) {
      var cls =
        s === 'hopping' ? 'is-hopping' : s === 'eating' ? 'is-idle is-eating' : 'is-idle';
      rabbitEl.className = 'hero-yard__rabbit ' + cls;
    }

    function startHop(distance, nextState) {
      rabbitState = 'hopping';
      rabbitTimer = 0;
      rabbitHopStartX = rabbitX;
      rabbitHopDist = distance;
      rabbitFacing = distance >= 0 ? 1 : -1;
      rabbitHopTargetState = nextState;
      setRabbitVisual('hopping');
    }

    function stepRabbit(dt) {
      rabbitTimer += dt * 1000;
      var distToDog = Math.abs(rabbitX - dogX);
      var rabbitY = 0;

      if (rabbitState !== 'fleeing' && distToDog < RABBIT_FLEE_RADIUS) {
        if (plateOccupant === 'rabbit') plateOccupant = null;
        var fleeDir = rabbitX >= dogX ? 1 : -1;
        rabbitState = 'fleeing';
        startHop(fleeDir * RABBIT_FLEE_HOP_DISTANCE, 'fleeing');
      }

      if (rabbitState === 'idle') {
        if (rabbitTimer > rabbitGap) {
          if (!plateOccupant && Math.random() < 0.35) {
            plateOccupant = 'rabbit';
            var toPlate = plateX + RABBIT_PLATE_X_OFFSET - rabbitX;
            startHop(
              Math.max(-RABBIT_HOP_DISTANCE, Math.min(RABBIT_HOP_DISTANCE, toPlate)),
              Math.abs(toPlate) < RABBIT_HOP_DISTANCE ? 'eating' : 'to-plate'
            );
          } else {
            startHop(RABBIT_HOP_DISTANCE, 'idle');
          }
        }
      } else if (rabbitState === 'to-plate') {
        if (rabbitTimer > rabbitGap) {
          var remaining = plateX + RABBIT_PLATE_X_OFFSET - rabbitX;
          startHop(
            Math.max(-RABBIT_HOP_DISTANCE, Math.min(RABBIT_HOP_DISTANCE, remaining)),
            Math.abs(remaining) < RABBIT_HOP_DISTANCE ? 'eating' : 'to-plate'
          );
        }
      } else if (rabbitState === 'hopping') {
        var hp = Math.min(1, rabbitTimer / RABBIT_HOP_DURATION);
        rabbitX = rabbitHopStartX + rabbitHopDist * hp;
        rabbitY = -Math.sin(hp * Math.PI) * RABBIT_HOP_HEIGHT;
        if (hp >= 1) {
          rabbitX = Math.max(-40, Math.min(width + 40, rabbitX));
          if (rabbitX > width + 30) rabbitX = -30;
          rabbitTimer = 0;
          if (rabbitHopTargetState === 'eating') {
            rabbitState = 'eating';
            rabbitEatFor = 3200 + Math.random() * 1800;
            setRabbitVisual('eating');
          } else if (rabbitHopTargetState === 'fleeing') {
            rabbitState = 'idle'; // one flee hop is usually enough; re-checked each frame above
            rabbitGap = 300 + Math.random() * 300;
            setRabbitVisual('idle');
          } else {
            rabbitState = rabbitHopTargetState;
            rabbitGap = 700 + Math.random() * 900;
            setRabbitVisual('idle');
          }
        }
      } else if (rabbitState === 'eating') {
        if (rabbitTimer > rabbitEatFor) {
          plateOccupant = null;
          rabbitState = 'idle';
          rabbitTimer = 0;
          rabbitGap = 700 + Math.random() * 900;
        }
      }

      rabbitEl.style.transform =
        'translate3d(' +
        rabbitX.toFixed(1) +
        'px,' +
        rabbitY.toFixed(1) +
        'px,0) scaleX(' +
        rabbitFacing +
        ')';
    }

    /* ---------------- BIRD ---------------- */
    var BIRD_FLEE_RADIUS = 100;
    var BIRD_WATER_CHANCE = 0.3; // otherwise prefers the plate
    var birdState = 'hidden'; // hidden | in | landed | out | flee
    var birdX = -60;
    var birdY = -40;
    var birdFacing = 1;
    var birdTimer = 0;
    var birdLandTarget = 0;
    var birdLandKind = 'none'; // 'plate' | 'water' | 'none'
    var nextBirdAt = 1200 + Math.random() * 2000;

    function setBirdVisual(s) {
      var cls =
        s === 'landed-eating'
          ? 'is-perched is-eating'
          : s === 'landed'
          ? 'is-perched'
          : 'is-flying';
      birdEl.className = 'hero-yard__bird' + (s === 'hidden' ? '' : ' ' + cls);
      birdEl.style.opacity = s === 'hidden' ? '0' : '1';
    }

    function releaseBirdSlot() {
      if (birdLandKind === 'plate' && plateOccupant === 'bird') plateOccupant = null;
      if (birdLandKind === 'water' && waterOccupant === 'bird') waterOccupant = null;
      birdLandKind = 'none';
    }

    function stepBird(dt) {
      birdTimer += dt * 1000;
      var distToDog = Math.hypot(birdX - dogX, birdY);

      if (
        (birdState === 'in' || birdState === 'landed') &&
        distToDog < BIRD_FLEE_RADIUS
      ) {
        releaseBirdSlot();
        birdState = 'flee';
        birdTimer = 0;
        setBirdVisual('flee');
      }

      if (birdState === 'hidden') {
        if (birdTimer > nextBirdAt) {
          birdState = 'in';
          birdTimer = 0;
          birdX = -60;
          birdY = -40;

          var wantsWater = Math.random() < BIRD_WATER_CHANCE;
          if (wantsWater && !waterOccupant) {
            waterOccupant = 'bird';
            birdLandTarget = waterX;
            birdLandKind = 'water';
          } else if (!plateOccupant) {
            plateOccupant = 'bird';
            birdLandTarget = plateX;
            birdLandKind = 'plate';
          } else if (!waterOccupant) {
            waterOccupant = 'bird';
            birdLandTarget = waterX;
            birdLandKind = 'water';
          } else {
            birdLandTarget = width * 0.55; // both taken -- just a neutral perch, not eating/drinking
            birdLandKind = 'none';
          }
          setBirdVisual('in');
        }
      } else if (birdState === 'in') {
        birdFacing = 1;
        birdX += 70 * dt;
        birdY += (0 - birdY) * 0.06;
        if (birdX > birdLandTarget - 6) {
          birdState = 'landed';
          birdTimer = 0;
          // Water sits to the right of the plate -- face back toward the
          // plate/cluster instead of continuing to look away from it.
          if (birdLandKind === 'water') birdFacing = -1;
        }
      } else if (birdState === 'landed') {
        setBirdVisual(birdLandKind === 'none' ? 'landed' : 'landed-eating');
        if (birdTimer > 2600) {
          releaseBirdSlot();
          birdState = 'out';
          birdTimer = 0;
          setBirdVisual('out');
        }
      } else if (birdState === 'out') {
        birdFacing = 1;
        birdX += 90 * dt;
        birdY -= 60 * dt;
        if (birdX > width + 60) {
          birdState = 'hidden';
          birdTimer = 0;
          nextBirdAt = 4000 + Math.random() * 4000;
          setBirdVisual('hidden');
        }
      } else if (birdState === 'flee') {
        var fleeDir = birdX >= dogX ? 1 : -1;
        birdFacing = fleeDir;
        birdX += fleeDir * 130 * dt; // away, horizontally
        birdY -= 70 * dt; // and higher, at the same time
        if (birdTimer > 900) {
          birdState = 'hidden';
          birdTimer = 0;
          nextBirdAt = 3000 + Math.random() * 3000;
          setBirdVisual('hidden');
        }
      }

      birdEl.style.transform =
        'translate3d(' +
        birdX.toFixed(1) +
        'px,' +
        birdY.toFixed(1) +
        'px,0) scaleX(' +
        birdFacing +
        ')';
    }

    /* ---------------- BUTTERFLY ---------------- */
    var butterflyX = -30;
    var butterflyY = -(34 + Math.random() * 14);
    var butterflyBaseY = 34 + Math.random() * 14;
    var butterflyPhase = Math.random() * Math.PI * 2;
    var BUTTERFLY_SPEED = 12;
    var BUTTERFLY_WATER_Y = -6; // bowl spans ~14-32px from ground; this lands it at the water surface
    var BUTTERFLY_HALF_WIDTH = 14; // half of the butterfly's 28px CSS width, for centering on waterX
    var butterflyState = 'wander'; // wander | to-water | drinking | from-water
    var butterflyTimer = 0;
    var butterflyNextDrinkAt = 5000 + Math.random() * 6000;
    var butterflyDrinkFor = 0;

    function stepButterfly(dt) {
      butterflyTimer += dt * 1000;

      if (butterflyState === 'wander') {
        butterflyX += BUTTERFLY_SPEED * dt;
        if (butterflyX > width + 40) butterflyX = -40;
        butterflyPhase += dt * 2.2;
        butterflyY = -(butterflyBaseY + Math.sin(butterflyPhase) * 8);

        if (butterflyTimer > butterflyNextDrinkAt) {
          butterflyTimer = 0;
          butterflyNextDrinkAt = 6000 + Math.random() * 7000;
          if (!waterOccupant) {
            waterOccupant = 'butterfly';
            butterflyState = 'to-water';
          }
        }
      } else if (butterflyState === 'to-water') {
        var dx = waterX - BUTTERFLY_HALF_WIDTH - butterflyX;
        var dy = BUTTERFLY_WATER_Y - butterflyY;
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
          butterflyState = 'drinking';
          butterflyTimer = 0;
          butterflyDrinkFor = 1800 + Math.random() * 1400;
        } else {
          butterflyX += Math.sign(dx) * 40 * dt;
          butterflyY += dy * 0.08;
        }
      } else if (butterflyState === 'drinking') {
        if (butterflyTimer > butterflyDrinkFor) {
          waterOccupant = null;
          butterflyState = 'from-water';
          butterflyTimer = 0;
          butterflyPhase = Math.random() * Math.PI * 2;
        }
      } else if (butterflyState === 'from-water') {
        // Ease back up toward cruising altitude instead of snapping straight
        // to the wander formula's value -- that's what caused the jump.
        butterflyX += BUTTERFLY_SPEED * dt;
        if (butterflyX > width + 40) butterflyX = -40;
        butterflyPhase += dt * 2.2;
        var cruiseY = -(butterflyBaseY + Math.sin(butterflyPhase) * 8);
        butterflyY += (cruiseY - butterflyY) * 0.05;
        if (Math.abs(cruiseY - butterflyY) < 2) {
          butterflyState = 'wander';
          butterflyTimer = 0;
        }
      }

      butterflyEl.style.transform =
        'translate3d(' + butterflyX.toFixed(1) + 'px,' + butterflyY.toFixed(1) + 'px,0)';
    }

    /* ---------------- MAIN LOOP ---------------- */
    var active = false;
    var rafId = 0;
    var lastT = 0;

    function tick(t) {
      if (!active) return;
      var dt = Math.min(t - lastT, 40) / 1000;
      lastT = t;

      stepBall(dt);
      stepDog(dt);
      stepCat(dt);
      stepRabbit(dt);
      stepBird(dt);
      stepButterfly(dt);

      rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (active) return;
      active = true;
      lastT = performance.now();
      rafId = requestAnimationFrame(tick);
      bindPointerListeners();
    }

    function stopLoop() {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      unbindPointerListeners();
      if (ball.held) {
        ball.held = false;
        ballEl.classList.remove('is-held');
      }
    }

    function measure() {
      width = yard.offsetWidth;
      positionPlate();
    }

    window.addEventListener('resize', measure, { passive: true });

    // Watches the tall .hero-yard-wrap (not just the small `yard` box) so
    // the critters keep patrolling for the whole time the box is pinned,
    // not just a narrow strip around it.
    var wrapForLoop = document.getElementById('hero-yard-wrap') || yard;

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              startLoop();
              window.PetlioHeroYardActive = true;
              document.body.classList.add('petlio-hero-yard-active');
            } else {
              stopLoop();
              window.PetlioHeroYardActive = false;
              document.body.classList.remove('petlio-hero-yard-active');
            }
          });
        },
        { rootMargin: '160px 0px' }
      );
      io.observe(wrapForLoop);
    } else {
      startLoop();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();