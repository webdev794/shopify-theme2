/* ========================================
   PRODUCT SECTION JAVASCRIPT
   ======================================== */

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange.bind(this));
  }

  connectedCallback() {
    this.sectionId = this.dataset.sectionId;
  }

  onVariantChange() {
    const variants = (window.themeProductVariants && window.themeProductVariants[this.sectionId]) || [];

    const selectedOptions = Array.from(this.querySelectorAll('.product__option')).map((fieldset) => {
      const checked = fieldset.querySelector('input:checked');
      return checked ? checked.value : null;
    });

    const variant = variants.find((variant) =>
      variant.options.every((option, index) => option === selectedOptions[index])
    );

    this.updateOptionLabels(selectedOptions);
    this.updateURL(variant);
    this.updateVariantInput(variant);
    this.updatePrice(variant);
    this.updateMedia(variant);
    this.updateAddToCart(variant);
    updateSellingPlanUI(this.sectionId);
    updateShopPayInstallments(this.sectionId, variant);
    updatePickupAvailability(this.sectionId, variant);
  }

  updateOptionLabels(selectedOptions) {
    this.querySelectorAll('.product__option').forEach((fieldset, index) => {
      const label = fieldset.querySelector('[data-selected-value]');
      if (label) label.textContent = selectedOptions[index];
    });
  }

  updateURL(variant) {
    if (!variant || !window.history) return;
    window.history.replaceState({}, '', `${window.location.pathname}?variant=${variant.id}`);
  }

  updateVariantInput(variant) {
    if (!variant) return;
    document
      .querySelectorAll(`#product-form-${this.sectionId} [data-variant-id-input]`)
      .forEach((input) => {
        input.value = variant.id;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
  }

  updatePrice(variant) {
    if (!variant) return;
    const wrapper = document.getElementById(`product-price-${this.sectionId}`);
    if (!wrapper) return;

    if (variant.compare_at_price > variant.price) {
      wrapper.innerHTML = `
        <span class="price price--sale">${variant.price_formatted}</span>
        <span class="price price--compare"><s>${variant.compare_at_price_formatted}</s></span>
      `;
    } else {
      wrapper.innerHTML = `<span class="price">${variant.price_formatted}</span>`;
    }

    wrapper.dataset.unitPrice = variant.price;
    updateTotalPriceForSection(this.sectionId);

    const unitPriceWrapper = document.getElementById(`unit-price-${this.sectionId}`);
    if (unitPriceWrapper) {
      if (variant.has_unit_pricing) {
        const refValue = variant.unit_price_reference_value !== 1 ? variant.unit_price_reference_value : '';
        const label = window.themeStrings?.unitPriceLabel || 'Unit price';
        unitPriceWrapper.innerHTML = `
          <div class="unit-price">
            <span class="visually-hidden">${label}</span>
            <span class="unit-price__price">${variant.unit_price_formatted}</span>/<span class="unit-price__unit">${refValue}${variant.unit_price_reference_unit}</span>
          </div>
        `;
      } else {
        unitPriceWrapper.innerHTML = '';
      }
    }
  }

  updateMedia(variant) {
    if (!variant || !variant.featured_media_id) return;
    const target = document.getElementById(`media-${this.sectionId}-${variant.featured_media_id}`);
    if (!target) return;

    document
      .querySelectorAll(`#product-media-main-${this.sectionId} .product__media-item`)
      .forEach((item) => item.classList.toggle('is-active', item === target));

    document
      .querySelectorAll('.product__media-thumb')
      .forEach((thumb) => {
        const isActive = thumb.dataset.mediaId === String(variant.featured_media_id);
        thumb.classList.toggle('is-active', isActive);
        if (isActive) {
          thumb.setAttribute('aria-current', 'true');
          thumb.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        } else {
          thumb.removeAttribute('aria-current');
        }
      });
  }

  updateAddToCart(variant) {
    const button = document.querySelector(`#product-form-${this.sectionId} [data-add-to-cart]`);
    const text = document.querySelector(`#product-form-${this.sectionId} [data-add-to-cart-text]`);
    if (!button || !text) return;

    if (!variant) {
      button.disabled = true;
      text.textContent = window.themeStrings?.unavailable || 'Unavailable';
    } else if (!variant.available) {
      button.disabled = true;
      text.textContent = window.themeStrings?.soldOut || 'Sold out';
    } else {
      button.disabled = false;
      text.textContent = window.themeStrings?.addToCart || 'Add to cart';
    }
  }
}

customElements.define('variant-selects', VariantSelects);

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

// Populate variant data from JSON scripts
window.themeProductVariants = window.themeProductVariants || {};
document.querySelectorAll('[data-product-variants]').forEach((script) => {
  const sectionId = script.id.replace('product-variants-', '');
  try {
    window.themeProductVariants[sectionId] = JSON.parse(script.textContent);
  } catch (error) {
    window.themeProductVariants[sectionId] = [];
  }
});

// Update selling plan UI (works with product.selling_plan_groups —
// populated by ANY app that registers plans via Shopify's Selling Plans API)
function updateSellingPlanUI(sectionId) {
  const checkedPlan = document.querySelector(
    `#selling-plans-${sectionId} [data-selling-plan-radio]:checked`
  );
  const planId = checkedPlan ? checkedPlan.value : '';

  const hiddenInput = document.querySelector(`#product-form-${sectionId} [data-selling-plan-input]`);
  if (hiddenInput) {
    hiddenInput.value = planId;
    hiddenInput.disabled = false;
  }

  const variantInput = document.querySelector(`#product-form-${sectionId} [data-variant-id-input]`);
  const variantId = variantInput ? variantInput.value : null;
  const variants = window.themeProductVariants[sectionId];
  if (!variants || !variantId) return;

  const variant = variants.find((item) => String(item.id) === String(variantId));
  if (!variant) return;

  const priceWrapper = document.getElementById(`product-price-${sectionId}`);
  if (!priceWrapper) return;

  let priceFormatted = variant.price_formatted;
  let compareFormatted = variant.compare_at_price_formatted;

  if (planId) {
    const allocation = (variant.selling_plan_allocations || []).find(
      (item) => String(item.selling_plan_id) === String(planId)
    );
    if (allocation) {
      priceFormatted = allocation.price_formatted;
      compareFormatted = allocation.compare_at_price_formatted;
    }
  }

  if (compareFormatted && compareFormatted !== priceFormatted) {
    priceWrapper.innerHTML = `
      <span class="price price--sale">${priceFormatted}</span>
      <span class="price price--compare"><s>${compareFormatted}</s></span>
    `;
  } else {
    priceWrapper.innerHTML = `<span class="price">${priceFormatted}</span>`;
  }
}

// Format money helper
function formatMoney(cents, format) {
  function withDelimiters(number, precision, thousands, decimalSep) {
    if (isNaN(number) || number === null) return 0;
    const fixed = (number / 100).toFixed(precision);
    const parts = fixed.split('.');
    const wholePart = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1${thousands}`);
    const decimalPart = parts[1] ? decimalSep + parts[1] : '';
    return wholePart + decimalPart;
  }

  if (!format) return `$${(cents / 100).toFixed(2)}`;
  const placeholder = /\{\{\s*(\w+)\s*\}\}/;
  const match = format.match(placeholder);
  if (!match) return format;

  let value;
  switch (match[1]) {
    case 'amount_no_decimals':
      value = withDelimiters(cents, 0, ',', '.');
      break;
    case 'amount_with_comma_separator':
      value = withDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = withDelimiters(cents, 0, '.', ',');
      break;
    case 'amount_with_apostrophe_separator':
      value = withDelimiters(cents, 2, "'", '.');
      break;
    default:
      value = withDelimiters(cents, 2, ',', '.');
  }

  return format.replace(placeholder, value);
}

// Update total price for quantity
function updateTotalPriceForSection(sectionId) {
  const quantityWrapper = document.querySelector(
    `.product__quantity[data-section-id="${sectionId}"]`
  );
  if (!quantityWrapper) return;

  const input = quantityWrapper.querySelector('input[type="number"]');
  const priceWrapper = document.getElementById(`product-price-${sectionId}`);
  const totalEl = quantityWrapper.querySelector('[data-price-total]');
  const amountEl = quantityWrapper.querySelector('[data-price-total-amount]');
  if (!input || !priceWrapper || !totalEl || !amountEl) return;

  const unitPrice = parseInt(priceWrapper.dataset.unitPrice, 10);
  const quantity = parseInt(input.value, 10) || 1;

  if (!unitPrice || quantity <= 1) {
    totalEl.hidden = true;
    return;
  }

  totalEl.hidden = false;
  amountEl.textContent = formatMoney(unitPrice * quantity, priceWrapper.dataset.moneyFormat);
}

/* ========================================
   SHOP PAY INSTALLMENTS
   ======================================== */

function updateShopPayInstallments(sectionId, variant) {
  const installmentsWrapper = document.getElementById(`shop-pay-installments-${sectionId}`);
  if (!installmentsWrapper || !variant) return;

  const installmentsCount = parseInt(installmentsWrapper.dataset.installments) || 6;
  const minPrice = parseInt(installmentsWrapper.dataset.minPrice) || 5000;

  if (variant.price < minPrice) {
    installmentsWrapper.style.display = 'none';
    return;
  } else {
    installmentsWrapper.style.display = 'block';
  }

  const priceEl = installmentsWrapper.querySelector('[data-installments-price]');
  const amountEl = installmentsWrapper.querySelector('[data-installments-amount]');
  const monthsEl = installmentsWrapper.querySelector('[data-installments-months]');

  if (priceEl && variant.price_formatted) {
    priceEl.textContent = variant.price_formatted;
  }

  if (amountEl && variant.price) {
    const installmentPrice = variant.price / installmentsCount;
    const moneyFormat = document.querySelector(`#product-price-${sectionId}`)?.dataset.moneyFormat || '${{amount}}';
    const formattedInstallment = formatMoney(installmentPrice, moneyFormat);
    amountEl.textContent = formattedInstallment;
  }

  if (monthsEl) {
    monthsEl.textContent = installmentsCount;
  }
}

/* ========================================
   PICKUP AVAILABILITY
   ======================================== */

window.themePickupVariants = window.themePickupVariants || {};
document.querySelectorAll('[data-pickup-variants]').forEach((script) => {
  const wrapper = script.closest('.pickup-availability');
  if (!wrapper) return;
  try {
    window.themePickupVariants[wrapper.dataset.sectionId] = JSON.parse(script.textContent);
  } catch (error) {
    window.themePickupVariants[wrapper.dataset.sectionId] = [];
  }
});

function pickupIcon(available) {
  return available
    ? '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
}

function updatePickupAvailability(sectionId, variant) {
  const wrapper = document.getElementById(`pickup-availability-${sectionId}`);
  if (!wrapper || !variant) return;

  const data = (window.themePickupVariants[sectionId] || []).find((item) => String(item.id) === String(variant.id));
  const locations = data ? data.locations : [];
  const body = wrapper.querySelector('[data-pickup-body]');
  const modalList = wrapper.querySelector('[data-pickup-modal-list]');
  if (!body) return;

  if (!locations || locations.length === 0) {
    body.innerHTML = `<span class="pickup-availability__none">${wrapper.dataset.noPickupText || 'Pickup currently unavailable for this item'}</span>`;
    if (modalList) modalList.innerHTML = '';
    return;
  }

  const first = locations[0];
  const statusClass = first.available ? 'pickup-availability__icon--available' : 'pickup-availability__icon--unavailable';
  const statusText = first.available
    ? `${wrapper.dataset.availableText || 'Pickup available at'} ${first.name}`
    : `${wrapper.dataset.unavailableText || 'Pickup currently unavailable at'} ${first.name}`;

  body.innerHTML = `
    <span class="pickup-availability__icon ${statusClass}">${pickupIcon(first.available)}</span>
    <span class="pickup-availability__text">
      <span class="pickup-availability__status">${statusText}</span>
      <span class="pickup-availability__time">${first.pickup_time || ''}</span>
      ${locations.length > 1 ? `<button type="button" class="pickup-availability__link" data-pickup-modal-open>${wrapper.dataset.viewAllText || 'View store info'}</button>` : ''}
    </span>
  `;

  if (modalList) {
    modalList.innerHTML = locations
      .map(
        (loc) => `
        <li class="pickup-availability-modal__item">
          <span class="pickup-availability__icon ${loc.available ? 'pickup-availability__icon--available' : 'pickup-availability__icon--unavailable'}">${pickupIcon(loc.available)}</span>
          <div>
            <p class="pickup-availability-modal__location-name">${loc.name}</p>
            <p class="pickup-availability-modal__location-address">${loc.address || ''}</p>
            <p class="pickup-availability-modal__location-status">${loc.pickup_time || (loc.available ? 'Usually ready' : 'Currently unavailable')}</p>
          </div>
        </li>`
      )
      .join('');
  }
}

// Thumbnail click: swap main image in place (no page jump from href="#…")
document.addEventListener('click', (event) => {
  const thumb = event.target.closest('.product__media-thumb');
  if (!thumb) return;

  event.preventDefault();

  const mediaId = thumb.dataset.mediaId;
  const mediaRoot = thumb.closest('.product__media') || document;

  mediaRoot.querySelectorAll('.product__media-thumb').forEach((t) => {
    t.classList.toggle('is-active', t === thumb);
    if (t === thumb) {
      t.setAttribute('aria-current', 'true');
    } else {
      t.removeAttribute('aria-current');
    }
  });

  mediaRoot.querySelectorAll('.product__media-item').forEach((item) =>
    item.classList.toggle('is-active', item.dataset.mediaId === mediaId)
  );

  // Keep active thumb visible in the horizontal strip
  if (typeof thumb.scrollIntoView === 'function') {
    thumb.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }
});

// Modal open/close (event delegation, works after innerHTML rebuilds)
document.addEventListener('click', (event) => {
  const openTrigger = event.target.closest('[data-pickup-modal-open]');
  if (openTrigger) {
    const wrapper = openTrigger.closest('.pickup-availability');
    const modal = wrapper?.querySelector('[data-pickup-modal]');
    if (modal) modal.hidden = false;
    return;
  }

  const closeTrigger = event.target.closest('[data-pickup-modal-close]');
  if (closeTrigger) {
    const modal = closeTrigger.closest('[data-pickup-modal]');
    if (modal) modal.hidden = true;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('[data-pickup-modal]:not([hidden])').forEach((modal) => {
    modal.hidden = true;
  });
});

/* ========================================
   EVENT LISTENERS
   ======================================== */

// Selling plan radio changes
document.addEventListener('change', (event) => {
  const radio = event.target.closest('[data-selling-plan-radio]');
  if (radio) {
    const wrapper = radio.closest('[data-selling-plans]');
    if (wrapper) {
      const sectionId = wrapper.id.replace('selling-plans-', '');
      updateSellingPlanUI(sectionId);
    }
  }
});

// Quantity input changes
document.addEventListener('input', (event) => {
  const input = event.target.closest('.product__quantity input[type="number"]');
  if (!input) return;

  const sectionId = input.closest('.product__quantity').dataset.sectionId;
  updateTotalPriceForSection(sectionId);
});

// Quantity buttons (increase/decrease)
document.addEventListener('click', (event) => {
  const decreaseButton = event.target.closest('[data-quantity-decrease]');
  const increaseButton = event.target.closest('[data-quantity-increase]');
  if (!decreaseButton && !increaseButton) return;

  const wrapper = event.target.closest('.quantity-input');
  const input = wrapper.querySelector('input[type="number"]');
  const step = parseInt(input.step, 10) || 1;
  const min = parseInt(input.min, 10) || 1;
  let value = parseInt(input.value, 10) || min;

  value = increaseButton ? value + step : Math.max(min, value - step);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

/* ========================================
   INITIALIZATION
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize selling plans
  document.querySelectorAll('[data-selling-plans]').forEach((wrapper) => {
    const sectionId = wrapper.id.replace('selling-plans-', '');
    updateSellingPlanUI(sectionId);
  });

  // Initialize quantity totals
  document.querySelectorAll('.product__quantity').forEach((wrapper) => {
    updateTotalPriceForSection(wrapper.dataset.sectionId);
  });

  // Initialize Shop Pay Installments and Pickup Availability
  document.querySelectorAll('.product__buy-buttons, .product__info').forEach(() => {});

  document.querySelectorAll('.shop-pay-installments, .pickup-availability').forEach((wrapper) => {
    const sectionId = wrapper.dataset.sectionId || wrapper.id.replace('shop-pay-installments-', '');
    const variants = window.themeProductVariants[sectionId];
    if (!variants || variants.length === 0) return;

    const variantInput = document.querySelector(`#product-form-${sectionId} [data-variant-id-input]`);
    const variantId = variantInput ? variantInput.value : null;
    const variant = variants.find((item) => String(item.id) === String(variantId));
    if (!variant) return;

    if (wrapper.classList.contains('shop-pay-installments')) {
      updateShopPayInstallments(sectionId, variant);
    }
    if (wrapper.classList.contains('pickup-availability')) {
      updatePickupAvailability(sectionId, variant);
    }
  });
});