document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="shop-the-kit"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    const addToCartBtn = section.querySelector('.shop-the-kit__add-to-cart');
    const variantSelectors = section.querySelectorAll('.shop-the-kit__variant-selector');
    const totalPriceElement = section.querySelector('#kit-total-price');
    const products = section.querySelectorAll('.shop-the-kit__product');
    
    let selectedVariants = {};
    let originalPrices = {};
    
    // Store original prices
    products.forEach(function(product) {
      const productId = product.dataset.productId;
      const selector = product.querySelector('.shop-the-kit__variant-selector');
      const priceDisplay = product.querySelector('.shop-the-kit__product-price-current');
      
      if (selector) {
        // Get first variant price
        const firstOption = selector.querySelector('option');
        if (firstOption) {
          const priceMatch = firstOption.dataset.price;
          if (priceMatch) {
            originalPrices[productId] = priceMatch;
          }
        }
      } else if (priceDisplay) {
        // Store displayed price
        originalPrices[productId] = priceDisplay.textContent.trim();
      }
    });
    
    // Update total price function
    function updateTotalPrice() {
      let total = 0;
      let allSelected = true;
      
      products.forEach(function(product) {
        const productId = product.dataset.productId;
        const selector = product.querySelector('.shop-the-kit__variant-selector');
        const priceDisplay = product.querySelector('.shop-the-kit__product-price-current');
        
        if (selector) {
          const selectedOption = selector.options[selector.selectedIndex];
          if (selectedOption) {
            // Get price from data attribute or parse from option text
            let priceString = selectedOption.dataset.price;
            if (!priceString) {
              // Fallback: extract from text content
              const optionText = selectedOption.textContent.trim();
              const priceMatch = optionText.match(/\$\d+\.?\d*/);
              if (priceMatch) {
                priceString = priceMatch[0];
              }
            }
            
            if (priceString) {
              // Convert string to number (remove currency symbols)
              const numericPrice = parseFloat(priceString.replace(/[^0-9.]/g, ''));
              if (!isNaN(numericPrice)) {
                total += numericPrice;
              }
            }
          }
        } else if (priceDisplay) {
          // Use displayed price
          const priceText = priceDisplay.textContent.trim();
          const numericPrice = parseFloat(priceText.replace(/[^0-9.]/g, ''));
          if (!isNaN(numericPrice)) {
            total += numericPrice;
          }
        }
      });
      
      // Update total display
      if (totalPriceElement) {
        const currencySymbol = '$';
        const formattedTotal = currencySymbol + total.toFixed(2);
        totalPriceElement.textContent = formattedTotal;
      }
    }
    
    // Handle variant changes
    variantSelectors.forEach(function(selector) {
      selector.addEventListener('change', function(e) {
        const productContainer = this.closest('.shop-the-kit__product');
        const productId = productContainer.dataset.productId;
        const selectedOption = this.options[this.selectedIndex];
        
        // Update price display
        const priceDisplay = productContainer.querySelector('.shop-the-kit__product-price-current');
        if (priceDisplay && selectedOption.dataset.price) {
          priceDisplay.textContent = selectedOption.dataset.price;
        }
        
        // Store selected variant
        selectedVariants[productId] = {
          variantId: this.value,
          price: selectedOption.dataset.price || null
        };
        
        updateTotalPrice();
      });
      
      // Trigger initial change to set defaults
      selector.dispatchEvent(new Event('change'));
    });
    
    // Add to cart functionality
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function() {
        const items = [];
        let isValid = true;
        
        products.forEach(function(product) {
          const productId = product.dataset.productId;
          const selector = product.querySelector('.shop-the-kit__variant-selector');
          let variantId;
          
          if (selector) {
            variantId = selector.value;
          } else {
            // Get first variant ID from data attribute or hidden input
            const variantInput = product.querySelector('[data-variant-id]');
            variantId = variantInput ? variantInput.dataset.variantId : null;
          }
          
          if (variantId) {
            items.push({
              id: parseInt(variantId),
              quantity: 1
            });
          } else {
            isValid = false;
          }
        });
        
        if (!isValid || items.length === 0) {
          alert('Please select options for all products.');
          return;
        }
        
        // Disable button
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Adding...';
        addToCartBtn.classList.add('loading');
        
        // Add items to cart
        items.forEach(function(item, index) {
          fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item)
          })
          .then(function(response) {
            if (!response.ok) {
              throw new Error('Failed to add item to cart');
            }
            return response.json();
          })
          .then(function(data) {
            // If it's the last item, show success
            if (index === items.length - 1) {
              addToCartBtn.textContent = 'Added! ✓';
              // Use CSS variable for success color
              addToCartBtn.style.background = 'var(--color-success, #2ecc71)';
              
              // Trigger cart update
              setTimeout(function() {
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = 'Add Kit to Cart';
                addToCartBtn.style.background = '';
                addToCartBtn.classList.remove('loading');
              }, 2000);
              
              // Update cart count if needed
              if (window.theme && window.theme.updateCartCount) {
                window.theme.updateCartCount();
              }
              
              // Redirect or open cart drawer
              if (window.theme && window.theme.openCartDrawer) {
                window.theme.openCartDrawer();
              }
            }
          })
          .catch(function(error) {
            console.error('Error adding to cart:', error);
            alert('There was an error adding the kit to your cart. Please try again.');
            
            // Reset button
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'Add Kit to Cart';
            addToCartBtn.classList.remove('loading');
          });
        });
      });
    }
  });
});