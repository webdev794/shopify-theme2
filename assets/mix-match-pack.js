document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="mix-match-pack"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    const maxItems = parseInt(section.dataset.maxItems) || 4;
    const selectBtns = section.querySelectorAll('.mix-match-pack__select-product');
    const addPackBtn = section.querySelector('.mix-match-pack__add-pack');
    const totalPriceElement = section.querySelector('.mix-match-pack__total-price');
    const selectedCountElement = section.querySelector('.mix-match-pack__selected-count');
    const variantSelectors = section.querySelectorAll('.mix-match-pack__variant-selector');
    
    let selectedProducts = [];
    let selectedVariants = {};
    
    // Helper: Parse price from cents
    function parsePriceFromCents(priceString) {
      if (!priceString) return 0;
      // Remove any non-numeric characters
      let cleaned = priceString.replace(/[^0-9]/g, '');
      let value = parseInt(cleaned, 10);
      if (isNaN(value)) return 0;
      // Convert cents to dollars
      return value / 100;
    }
    
    // Helper: Format price
    function formatPrice(amount) {
      return '$' + amount.toFixed(2);
    }
    
    // Helper: Get currency symbol from Shopify
    function getCurrencySymbol() {
      return '$';
    }
    
    // Initialize selected variants with prices
    variantSelectors.forEach(function(selector) {
      const productId = selector.dataset.productId;
      const selectedOption = selector.options[selector.selectedIndex];
      const priceText = selectedOption ? selectedOption.dataset.price || '0' : '0';
      
      selectedVariants[productId] = {
        variantId: selectedOption ? selectedOption.value : '',
        price: parsePriceFromCents(priceText)
      };
    });
    
    // Update variant selection
    variantSelectors.forEach(function(selector) {
      selector.addEventListener('change', function() {
        const productId = this.dataset.productId;
        const selectedOption = this.options[this.selectedIndex];
        const productCard = this.closest('.mix-match-pack__product-card');
        const selectBtn = productCard ? productCard.querySelector('.mix-match-pack__select-product') : null;
        
        if (selectedOption) {
          const priceText = selectedOption.dataset.price || '0';
          const priceValue = parsePriceFromCents(priceText);
          
          // Update variant data
          selectedVariants[productId] = {
            variantId: selectedOption.value,
            price: priceValue
          };
          
          // Update select button data
          if (selectBtn) {
            selectBtn.dataset.variantId = selectedOption.value;
            selectBtn.dataset.price = priceText;
          }
          
          // Update price display
          const priceCurrent = productCard ? productCard.querySelector('.mix-match-pack__product-price-current') : null;
          if (priceCurrent) {
            priceCurrent.textContent = formatPrice(priceValue);
          }
          
          // Update total if product is selected
          if (selectedProducts.includes(productId)) {
            updateTotal();
          }
        }
      });
    });
    
    // Select/Deselect product
    selectBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        const productId = this.dataset.productId;
        const productCard = this.closest('.mix-match-pack__product-card');
        const priceText = this.dataset.price || '0';
        const priceValue = parsePriceFromCents(priceText);
        
        if (this.classList.contains('selected')) {
          // Deselect
          this.classList.remove('selected');
          this.textContent = 'Select';
          if (productCard) {
            productCard.classList.remove('mix-match-pack__product-card--selected');
          }
          
          // Remove from selected array
          const index = selectedProducts.indexOf(productId);
          if (index > -1) {
            selectedProducts.splice(index, 1);
          }
        } else {
          // Check if max items reached
          if (selectedProducts.length >= maxItems) {
            alert('You can select a maximum of ' + maxItems + ' items.');
            return;
          }
          
          // Select
          this.classList.add('selected');
          this.textContent = 'Selected ✓';
          if (productCard) {
            productCard.classList.add('mix-match-pack__product-card--selected');
          }
          
          // Ensure variant data exists
          if (!selectedVariants[productId]) {
            const variantSelector = productCard ? productCard.querySelector('.mix-match-pack__variant-selector') : null;
            if (variantSelector) {
              const selectedOption = variantSelector.options[variantSelector.selectedIndex];
              selectedVariants[productId] = {
                variantId: selectedOption ? selectedOption.value : '',
                price: parsePriceFromCents(selectedOption ? selectedOption.dataset.price : '0')
              };
            } else {
              // No variant selector, use product price from button
              selectedVariants[productId] = {
                variantId: this.dataset.variantId || '',
                price: priceValue
              };
            }
          }
          
          // Add to selected array
          if (!selectedProducts.includes(productId)) {
            selectedProducts.push(productId);
          }
        }
        
        updateTotal();
        updateButtonState();
      });
    });
    
    // Update total price
    function updateTotal() {
      let total = 0;
      
      selectedProducts.forEach(function(productId) {
        // Get variant data
        const variantData = selectedVariants[productId];
        if (variantData && variantData.price) {
          total += variantData.price;
        }
      });
      
      // Update total display
      if (totalPriceElement) {
        totalPriceElement.textContent = formatPrice(total);
      }
      
      // Update count
      if (selectedCountElement) {
        selectedCountElement.textContent = selectedProducts.length;
      }
    }
    
    // Update add button state
    function updateButtonState() {
      if (addPackBtn) {
        addPackBtn.disabled = selectedProducts.length === 0;
      }
    }
    
    // Add pack to cart
    if (addPackBtn) {
      addPackBtn.addEventListener('click', function() {
        if (selectedProducts.length === 0) return;
        
        const items = [];
        
        selectedProducts.forEach(function(productId) {
          const variantData = selectedVariants[productId];
          if (variantData && variantData.variantId) {
            items.push({
              id: parseInt(variantData.variantId),
              quantity: 1
            });
          }
        });
        
        if (items.length === 0) {
          alert('Please select items for your pack.');
          return;
        }
        
        // Disable button
        addPackBtn.disabled = true;
        addPackBtn.textContent = 'Adding...';
        addPackBtn.classList.add('loading');
        
        // Add items to cart
        let completed = 0;
        const totalItems = items.length;
        
        items.forEach(function(item) {
          fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item)
          })
          .then(function(response) {
            if (!response.ok) {
              throw new Error('Failed to add item');
            }
            return response.json();
          })
          .then(function() {
            completed++;
            if (completed === totalItems) {
              addPackBtn.textContent = 'Pack Added ✓';
              // Use CSS variable for success color
              addPackBtn.style.background = 'var(--color-success, #2ecc71)';
              
              // Reset all selections
              setTimeout(function() {
                // Reset selection
                selectedProducts = [];
                selectBtns.forEach(function(btn) {
                  btn.classList.remove('selected');
                  btn.textContent = 'Select';
                  const card = btn.closest('.mix-match-pack__product-card');
                  if (card) {
                    card.classList.remove('mix-match-pack__product-card--selected');
                  }
                });
                updateTotal();
                updateButtonState();
                
                addPackBtn.textContent = 'Add Pack to Cart';
                addPackBtn.style.background = '';
                addPackBtn.disabled = true;
                addPackBtn.classList.remove('loading');
              }, 3000);
            }
          })
          .catch(function(error) {
            console.error('Error adding item:', error);
            alert('There was an error adding your pack. Please try again.');
            
            addPackBtn.disabled = false;
            addPackBtn.textContent = 'Add Pack to Cart';
            addPackBtn.classList.remove('loading');
          });
        });
      });
    }
    
    // Initialize variant data for all products
    function initializeVariantData() {
      const productCards = section.querySelectorAll('.mix-match-pack__product-card');
      productCards.forEach(function(card) {
        const productContainer = card.closest('.mix-match-pack__product');
        if (!productContainer) return;
        const productId = productContainer.dataset.productId;
        const variantSelector = card.querySelector('.mix-match-pack__variant-selector');
        const selectBtn = card.querySelector('.mix-match-pack__select-product');
        
        if (variantSelector) {
          const selectedOption = variantSelector.options[variantSelector.selectedIndex];
          if (selectedOption) {
            selectedVariants[productId] = {
              variantId: selectedOption.value,
              price: parsePriceFromCents(selectedOption.dataset.price || '0')
            };
            if (selectBtn) {
              selectBtn.dataset.variantId = selectedOption.value;
              selectBtn.dataset.price = selectedOption.dataset.price || '0';
            }
          }
        } else if (selectBtn) {
          // No variant selector, use button data
          selectedVariants[productId] = {
            variantId: selectBtn.dataset.variantId || '',
            price: parsePriceFromCents(selectBtn.dataset.price || '0')
          };
        }
      });
    }
    
    // Initialize
    initializeVariantData();
    updateTotal();
    updateButtonState();
  });
});