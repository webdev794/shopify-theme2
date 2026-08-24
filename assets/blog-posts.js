// blog-posts.js

document.addEventListener('DOMContentLoaded', function() {
  
  // ============================================
  // CAROUSEL - Smooth scroll with arrows
  // ============================================
  
  const carousels = document.querySelectorAll('.blog-posts[data-layout="carousel"]');
  
  carousels.forEach(function(carousel) {
    const grid = carousel.querySelector('.blog-posts__grid');
    if (!grid) return;
    
    // Add navigation arrows
    const wrapper = document.createElement('div');
    wrapper.className = 'blog-posts__carousel-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '1rem';
    
    // Arrow buttons
    const prevBtn = document.createElement('button');
    prevBtn.className = 'blog-posts__carousel-btn blog-posts__carousel-btn--prev';
    prevBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    `;
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'blog-posts__carousel-btn blog-posts__carousel-btn--next';
    nextBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    `;
    
    // Style buttons with CSS variables instead of hardcoded colors
    const btnStyle = `
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
    
    const styleEl = document.createElement('style');
    styleEl.textContent = btnStyle;
    document.head.appendChild(styleEl);
    
    // Wrap grid
    carousel.querySelector('.blog-posts__container').appendChild(wrapper);
    wrapper.appendChild(prevBtn);
    wrapper.appendChild(grid);
    wrapper.appendChild(nextBtn);
    
    // Scroll functions
    function scrollCarousel(direction) {
      const scrollAmount = grid.querySelector('.blog-posts__post')?.offsetWidth + 32 || 300;
      grid.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
    
    prevBtn.addEventListener('click', function() { scrollCarousel(-1); });
    nextBtn.addEventListener('click', function() { scrollCarousel(1); });
  });
  
  // ============================================
  // EQUAL HEIGHTS (optional)
  // ============================================
  
  function equalizeHeights() {
    const grids = document.querySelectorAll('.blog-posts__grid');
    grids.forEach(function(grid) {
      const posts = grid.querySelectorAll('.blog-posts__post');
      if (posts.length < 2) return;
      
      // Reset heights
      posts.forEach(function(post) {
        post.style.height = 'auto';
      });
      
      // Get max height
      let maxHeight = 0;
      posts.forEach(function(post) {
        const height = post.offsetHeight;
        if (height > maxHeight) maxHeight = height;
      });
      
      // Apply max height
      posts.forEach(function(post) {
        post.style.height = maxHeight + 'px';
      });
    });
  }
  
  // Run on load and resize
  window.addEventListener('load', equalizeHeights);
  window.addEventListener('resize', equalizeHeights);
  
  // ============================================
  // TILT EFFECT (optional)
  // ============================================
  
  const tiltCards = document.querySelectorAll('.blog-posts__post--elevated');
  tiltCards.forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });
    
    card.addEventListener('mouseleave', function() {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
});