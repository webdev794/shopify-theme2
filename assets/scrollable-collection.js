document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="scrollable-collection"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    const track = section.querySelector('.scrollable-collection__track');
    const prevBtn = section.querySelector('.scrollable-collection__control--prev');
    const nextBtn = section.querySelector('.scrollable-collection__control--next');
    const products = section.querySelectorAll('.scrollable-collection__product');
    
    let currentIndex = 0;
    let visibleCount = parseInt(section.dataset.visibleCount) || 4;
    let productWidth = 0;
    let gap = 20;
    let totalProducts = products.length;
    
    // Calculate product width including gap
    function getProductWidth() {
      if (products.length > 0) {
        const rect = products[0].getBoundingClientRect();
        const computedStyle = window.getComputedStyle(track);
        gap = parseInt(computedStyle.gap) || 20;
        return rect.width + gap;
      }
      return 240; // Default
    }
    
    // Get max scroll position
    function getMaxScroll() {
      const trackWidth = track.scrollWidth;
      const containerWidth = track.parentElement.clientWidth;
      return Math.max(0, trackWidth - containerWidth);
    }
    
    // Scroll to specific index
    function scrollToIndex(index, animate = true) {
      const maxIndex = Math.max(0, totalProducts - visibleCount);
      const targetIndex = Math.min(index, maxIndex);
      const scrollPosition = targetIndex * productWidth;
      
      if (!animate) {
        track.style.transition = 'none';
      } else {
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      
      track.style.transform = `translateX(-${scrollPosition}px)`;
      
      if (!animate) {
        track.offsetHeight; // Force reflow
        track.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      
      currentIndex = targetIndex;
      
      // Update button states
      if (prevBtn) {
        prevBtn.disabled = targetIndex === 0;
      }
      if (nextBtn) {
        nextBtn.disabled = targetIndex >= maxIndex;
      }
    }
    
    // Scroll next
    function scrollNext() {
      const maxIndex = Math.max(0, totalProducts - visibleCount);
      if (currentIndex < maxIndex) {
        scrollToIndex(currentIndex + 1);
      }
    }
    
    // Scroll prev
    function scrollPrev() {
      if (currentIndex > 0) {
        scrollToIndex(currentIndex - 1);
      }
    }
    
    // Handle resize
    function handleResize() {
      productWidth = getProductWidth();
      const maxIndex = Math.max(0, totalProducts - visibleCount);
      if (currentIndex > maxIndex) {
        scrollToIndex(maxIndex, false);
      } else {
        scrollToIndex(currentIndex, false);
      }
    }
    
    // Initialize
    function init() {
      productWidth = getProductWidth();
      const maxIndex = Math.max(0, totalProducts - visibleCount);
      
      // Set initial state
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = maxIndex === 0;
      
      // Ensure we don't scroll past the end
      if (currentIndex > maxIndex) {
        currentIndex = maxIndex;
      }
      
      scrollToIndex(currentIndex, false);
    }
    
    // Event listeners
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        scrollPrev();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        scrollNext();
      });
    }
    
    // Keyboard navigation
    section.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        scrollPrev();
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        scrollNext();
      }
    });
    
    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    track.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    track.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          scrollNext();
        } else {
          scrollPrev();
        }
      }
    }, { passive: true });
    
    // Update visible count on resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        // Recalculate visible count based on container width
        const containerWidth = track.parentElement.clientWidth;
        const computedGap = parseInt(window.getComputedStyle(track).gap) || 20;
        const cardWidth = products.length > 0 ? products[0].getBoundingClientRect().width : 220;
        const newVisibleCount = Math.floor((containerWidth + computedGap) / (cardWidth + computedGap));
        
        if (newVisibleCount !== visibleCount) {
          visibleCount = newVisibleCount;
          handleResize();
        }
      }, 250);
    });
    
    // Initialize
    setTimeout(init, 100);
    
    // Add to cart functionality
    const addToCartBtns = section.querySelectorAll('.scrollable-collection__add-to-cart');
    const quickAddBtns = section.querySelectorAll('.scrollable-collection__quick-add');
    
    addToCartBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        addToCart(this);
      });
    });
    
    quickAddBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        addToCart(this);
      });
    });
    
    function addToCart(btn) {
      const variantId = btn.dataset.variantId;
      const originalText = btn.textContent;
      
      btn.disabled = true;
      btn.textContent = 'Adding...';
      
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(variantId), quantity: 1 })
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to add to cart');
        return response.json();
      })
      .then(function() {
        btn.textContent = 'Added ✓';
        // Use CSS variable for success color
        btn.style.background = 'var(--color-success, #2ecc71)';
        
        setTimeout(function() {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }, 2000);
      })
      .catch(function(error) {
        console.error('Error adding to cart:', error);
        btn.textContent = 'Error';
        setTimeout(function() {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2000);
      });
    }
  });
});

// Shopify section reload
document.addEventListener('shopify:section:load', function(e) {
  // Reinitialize if needed
});

document.addEventListener('shopify:section:unload', function(e) {
  // Clean up if needed
});