/* trending-products.js */
document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="trending-products"]');
  
  sections.forEach(section => {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    const addToCartBtns = section.querySelectorAll('.trending-products__add-to-cart');
    const quickViewBtns = section.querySelectorAll('.trending-products__quick-view');
    
    addToCartBtns.forEach(btn => {
      btn.addEventListener('click', function(e) {
        const productId = this.dataset.productId;
        const variantId = this.dataset.variantId;
        
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: 1 })
        })
        .then(response => response.json())
        .then(data => {
          this.textContent = 'Added ✓';
          // Use CSS variable for success color
          this.style.background = 'var(--color-success, #2ecc71)';
          setTimeout(() => {
            this.textContent = 'Add to Cart';
            this.style.background = '';
          }, 2000);
        })
        .catch(error => console.error('Error adding to cart:', error));
      });
    });
    
    quickViewBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const productId = this.dataset.productId;
        // Open quick view modal or redirect
        console.log('Quick view product:', productId);
      });
    });
  });
});