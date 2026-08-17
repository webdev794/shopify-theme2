(function () {
  const modal = document.getElementById('QuickViewModal');
  if (!modal) return;

  const loadingEl = modal.querySelector('[data-quick-view-loading]');
  const contentEl = modal.querySelector('[data-quick-view-content]');
  let moneyFormat = window.themeStrings?.moneyFormat || '${{amount}}';

  function formatMoney(cents) {
    const amount = (cents / 100).toFixed(2);
    return moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amount);
  }

  let modelViewerLoading = null;
  function ensureModelViewerLoaded() {
    if (customElements.get('model-viewer')) return Promise.resolve();
    if (modelViewerLoading) return modelViewerLoading;

    // Google's official @google/model-viewer library — the same open-source
    // library Shopify's own model_viewer_tag/Hydrogen components use
    // internally. Shopify's own hosted copy lives at a shop-specific path
    // (not a fixed URL a theme can reference), so we load the official
    // upstream distribution instead, matching main-product.liquid's visual
    // behavior since it's the same underlying component.
    modelViewerLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return modelViewerLoading;
  }

  function mediaHtml(media) {
    switch (media.media_type) {
      case 'video':
      case 'external_video':
        // Shopify's product JSON gives sources for native video; external video
        // (YouTube/Vimeo) exposes host + external_id instead.
        if (media.host === 'youtube') {
          return `<iframe class="quick-view-modal__media-frame" src="https://www.youtube.com/embed/${media.external_id}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
        if (media.host === 'vimeo') {
          return `<iframe class="quick-view-modal__media-frame" src="https://player.vimeo.com/video/${media.external_id}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
        }
        if (media.sources && media.sources.length) {
          const src = media.sources.find((s) => s.mime_type === 'video/mp4') || media.sources[0];
          return `<video class="quick-view-modal__media-tag" src="${src.url}" controls playsinline></video>`;
        }
        return `<img class="quick-view-modal__media-tag" src="${media.preview_image.src}" alt="${media.alt || ''}">`;
      case 'model':
        return `<model-viewer class="quick-view-modal__media-tag" src="${media.sources?.[0]?.url || ''}" camera-controls auto-rotate ar></model-viewer>`;
      default:
        return `<img class="quick-view-modal__media-tag" src="${media.preview_image?.src || media.src}" alt="${media.alt || ''}" loading="lazy">`;
    }
  }

  function buildContent(product) {
    const media = product.media && product.media.length ? product.media : [{ media_type: 'image', preview_image: { src: product.featured_image } }];
    const variant = product.variants[0];

    if (media.some((m) => m.media_type === 'model')) {
      ensureModelViewerLoaded();
    }

    const mediaSlides = media
      .map((m, i) => `<div class="quick-view-modal__media-slide${i === 0 ? ' is-active' : ''}" data-media-index="${i}">${mediaHtml(m)}</div>`)
      .join('');

    const mediaThumbs = media.length > 1
      ? `<div class="quick-view-modal__thumbs">
          ${media.map((m, i) => `<button type="button" class="quick-view-modal__thumb${i === 0 ? ' is-active' : ''}" data-media-thumb="${i}"><img src="${m.preview_image?.src || m.src}" alt=""></button>`).join('')}
        </div>`
      : '';

    const optionSelects = product.options_with_values
      ? product.options_with_values.map((option, oi) => `
          <div class="quick-view-modal__option">
            <label>${option.name}</label>
            <select data-option-index="${oi}">
              ${option.values.map((v) => `<option value="${v}">${v}</option>`).join('')}
            </select>
          </div>
        `).join('')
      : '';

    contentEl.innerHTML = `
      <div class="quick-view-modal__media">
        <div class="quick-view-modal__media-track">${mediaSlides}</div>
        ${mediaThumbs}
      </div>
      <div class="quick-view-modal__info">
        <h2 class="quick-view-modal__title">${product.title}</h2>
        <p class="quick-view-modal__price" data-quick-view-price>${formatMoney(variant.price)}</p>
        <form data-quick-view-form>
          ${optionSelects}
          <input type="hidden" name="id" value="${variant.id}" data-quick-view-variant-id>
          <button type="submit" class="button button--primary" ${variant.available ? '' : 'disabled'} data-quick-view-submit>
            ${variant.available ? (window.themeStrings?.addToCart || 'Add to cart') : (window.themeStrings?.soldOut || 'Sold out')}
          </button>
        </form>
        <a href="/products/${product.handle}" class="quick-view-modal__full-link">${window.themeStrings?.viewFullDetails || 'View full details'}</a>
      </div>
    `;

    contentEl.dataset.variants = JSON.stringify(product.variants);

    loadingEl.hidden = true;
    contentEl.hidden = false;
  }

  function openModal(handle) {
    loadingEl.hidden = false;
    contentEl.hidden = true;
    contentEl.innerHTML = '';

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }

    fetch(`/products/${handle}.js`)
      .then((res) => res.json())
      .then(buildContent)
      .catch(() => {
        contentEl.innerHTML = `<p class="quick-view-modal__error">${window.themeStrings?.quickViewError || 'Unable to load product.'}</p>`;
        loadingEl.hidden = true;
        contentEl.hidden = false;
      });
  }

  function closeModal() {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-quick-view-open]');
    if (trigger) {
      event.preventDefault();
      openModal(trigger.dataset.productHandle);
      return;
    }

    if (event.target.closest('[data-quick-view-close]')) {
      closeModal();
      return;
    }

    // Media thumbnail switch
    const thumb = event.target.closest('[data-media-thumb]');
    if (thumb) {
      const index = thumb.dataset.mediaThumb;
      modal.querySelectorAll('[data-media-index]').forEach((slide) =>
        slide.classList.toggle('is-active', slide.dataset.mediaIndex === index)
      );
      modal.querySelectorAll('[data-quick-view-content] .quick-view-modal__thumb').forEach((t) =>
        t.classList.toggle('is-active', t === thumb)
      );
    }
  });

  // Update price/variant id when option selects change
  document.addEventListener('change', (event) => {
    const select = event.target.closest('[data-option-index]');
    if (!select) return;

    const form = select.closest('[data-quick-view-form]');
    const content = form.closest('[data-quick-view-content]');
    const variants = JSON.parse(content.dataset.variants || '[]');
    const selects = Array.from(form.querySelectorAll('[data-option-index]'));
    const selectedOptions = selects.map((s) => s.value);

    const match = variants.find((v) =>
      v.options.every((opt, i) => opt === selectedOptions[i])
    );

    const variantInput = form.querySelector('[data-quick-view-variant-id]');
    const priceEl = content.querySelector('[data-quick-view-price]');
    const submitBtn = form.querySelector('[data-quick-view-submit]');

    if (match) {
      variantInput.value = match.id;
      priceEl.textContent = formatMoney(match.price);
      submitBtn.disabled = !match.available;
      submitBtn.textContent = match.available
        ? (window.themeStrings?.addToCart || 'Add to cart')
        : (window.themeStrings?.soldOut || 'Sold out');
    } else {
      submitBtn.disabled = true;
      submitBtn.textContent = window.themeStrings?.unavailable || 'Unavailable';
    }
  });

  // Add to cart from the modal
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-quick-view-form]');
    if (!form) return;
    event.preventDefault();

    const variantId = form.querySelector('[data-quick-view-variant-id]').value;

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }),
    })
      .then((res) => res.json())
      .then(() => {
        document.dispatchEvent(new CustomEvent('cart:updated'));
        closeModal();
      })
      .catch(() => {});
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
})();