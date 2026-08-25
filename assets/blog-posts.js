// blog-posts.js

(function () {
  'use strict';

  var stylesInjected = false;

  function injectCarouselStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var btnStyle = `
      .blog-posts__carousel-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 10;
        background: var(--color-background, #ffffff);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 50%;
        width: 44px;
        height: 44px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        color: var(--color-foreground, #1a1a1a);
      }
      .blog-posts__carousel-btn:hover {
        background: var(--color-accent-background, #1a1a2e);
        border-color: var(--color-accent-background, #1a1a2e);
        color: var(--color-accent-foreground, #ffffff);
        box-shadow: 0 4px 20px color-mix(in srgb, var(--color-accent-background, #1a1a2e) 30%, transparent);
      }
      .blog-posts__carousel-btn svg {
        width: 20px;
        height: 20px;
      }
      .blog-posts__carousel-btn--prev { left: -22px; }
      .blog-posts__carousel-btn--next { right: -22px; }
      @media (max-width: 768px) {
        .blog-posts__carousel-btn { display: none; }
      }
    `;

    var styleEl = document.createElement('style');
    styleEl.textContent = btnStyle;
    document.head.appendChild(styleEl);
  }

  function equalizeHeights(grid) {
    var posts = grid.querySelectorAll('.blog-posts__post');
    if (posts.length < 2) return;

    posts.forEach(function (post) {
      post.style.height = 'auto';
    });

    var maxHeight = 0;
    posts.forEach(function (post) {
      var height = post.offsetHeight;
      if (height > maxHeight) maxHeight = height;
    });

    posts.forEach(function (post) {
      post.style.height = maxHeight + 'px';
    });
  }

  function initCarousel(carousel) {
    var grid = carousel.querySelector('.blog-posts__grid');
    if (!grid) return;

    injectCarouselStyles();

    var wrapper = document.createElement('div');
    wrapper.className = 'blog-posts__carousel-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '1rem';

    var prevBtn = document.createElement('button');
    prevBtn.className = 'blog-posts__carousel-btn blog-posts__carousel-btn--prev';
    prevBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    `;

    var nextBtn = document.createElement('button');
    nextBtn.className = 'blog-posts__carousel-btn blog-posts__carousel-btn--next';
    nextBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    `;

    var container = carousel.querySelector('.blog-posts__container');
    if (!container) return;
    container.appendChild(wrapper);
    wrapper.appendChild(prevBtn);
    wrapper.appendChild(grid);
    wrapper.appendChild(nextBtn);

    function scrollCarousel(direction) {
      var firstPost = grid.querySelector('.blog-posts__post');
      var scrollAmount = (firstPost ? firstPost.offsetWidth : 0) + 32 || 300;
      grid.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }

    prevBtn.addEventListener('click', function () { scrollCarousel(-1); });
    nextBtn.addEventListener('click', function () { scrollCarousel(1); });
  }

  function initTilt(card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;
      var rotateX = (y - centerY) / 20;
      var rotateY = (centerX - x) / 20;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  }

  function init(section) {
    if (!section || section.dataset.blogPostsInit) return;
    section.dataset.blogPostsInit = 'true';

    if (section.dataset.layout === 'carousel') {
      initCarousel(section);
    }

    var grid = section.querySelector('.blog-posts__grid');
    if (grid) {
      equalizeHeights(grid);
      window.addEventListener('resize', function () { equalizeHeights(grid); });
    }

    section.querySelectorAll('.blog-posts__post--elevated').forEach(initTilt);
  }

  function initAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.blog-posts').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  window.addEventListener('load', function () {
    document.querySelectorAll('.blog-posts__grid').forEach(equalizeHeights);
  });

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();
