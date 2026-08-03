document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="pairing-products"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    const track = section.querySelector('.pairing-products__pairings-track');
    const prevBtn = section.querySelector('.pairing-products__control--prev');
    const nextBtn = section.querySelector('.pairing-products__control--next');
    const addToCartBtns = section.querySelectorAll('.pairing-products__add-to-cart');
    const addBundleBtn = section.querySelector('.pairing-products__add-bundle');
    const totalPriceElement = section.querySelector('#bundle-total-price');
    const savingsElement = section.querySelector('#bundle-savings');
    
    let currentScroll = 0;
    const scrollAmount = 120; // Scroll amount per click
    
    // Add to cart functionality for individual products
    addToCartBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        addToCart(this);
      });
    });
    
    // Add bundle functionality
    if (addBundleBtn) {
      addBundleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        addBundleToCart(this);
      });
    }
    
    // Navigation controls for pairings track
    if (prevBtn && nextBtn && track) {
      function updateControls() {
        const maxScroll = track.scrollHeight - track.clientHeight;
        prevBtn.disabled = currentScroll <= 0;
        nextBtn.disabled = currentScroll >= maxScroll;
      }
      
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        currentScroll = Math.max(0, currentScroll - scrollAmount);
        track.scrollTo({
          top: currentScroll,
          behavior: 'smooth'
        });
        updateControls();
      });
      
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const maxScroll = track.scrollHeight - track.clientHeight;
        currentScroll = Math.min(maxScroll, currentScroll + scrollAmount);
        track.scrollTo({
          top: currentScroll,
          behavior: 'smooth'
        });
        updateControls();
      });
      
      track.addEventListener('scroll', function() {
        currentScroll = this.scrollTop;
        updateControls();
      });
      
      // Initial update
      setTimeout(updateControls, 100);
    }
    
    // Add to cart function
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
    
    // Add bundle to cart function
    function addBundleToCart(btn) {
      const productCards = section.querySelectorAll('.pairing-products__pairing-card');
      const mainProduct = section.querySelector('.pairing-products__main-card');
      const items = [];
      
      // Add main product
      const mainVariantId = section.querySelector('.pairing-products__main-link')?.dataset?.variantId;
      if (mainVariantId) {
        items.push({ id: parseInt(mainVariantId), quantity: 1 });
      }
      
      // Add pairing products
      const addBtns = section.querySelectorAll('.pairing-products__add-to-cart');
      addBtns.forEach(function(btn) {
        const variantId = btn.dataset.variantId;
        if (variantId && !btn.disabled) {
          items.push({ id: parseInt(variantId), quantity: 1 });
        }
      });
      
      if (items.length === 0) {
        alert('No products available in this bundle.');
        return;
      }
      
      btn.disabled = true;
      btn.textContent = 'Adding Bundle...';
      
      // Add items sequentially
      let completed = 0;
      const totalItems = items.length;
      
      items.forEach(function(item) {
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        })
        .then(function(response) {
          if (!response.ok) throw new Error('Failed to add item');
          return response.json();
        })
        .then(function() {
          completed++;
          if (completed === totalItems) {
            btn.textContent = 'Bundle Added ✓';
            // Use CSS variable for success color
            btn.style.background = 'var(--color-success, #2ecc71)';
            
            setTimeout(function() {
              btn.textContent = 'Add Bundle to Cart';
              btn.style.background = '';
              btn.disabled = false;
            }, 3000);
          }
        })
        .catch(function(error) {
          console.error('Error adding bundle item:', error);
          btn.textContent = 'Error';
          setTimeout(function() {
            btn.textContent = 'Add Bundle to Cart';
            btn.style.background = '';
            btn.disabled = false;
          }, 3000);
        });
      });
    }
    
    // Update bundle price when variants change
    const variantSelectors = section.querySelectorAll('.pairing-products__variant-selector');
    variantSelectors.forEach(function(selector) {
      selector.addEventListener('change', function() {
        updateBundlePrice();
      });
    });
    
    function updateBundlePrice() {
      // Update total price logic here if needed
      // This would require tracking variant prices
    }
  });
});