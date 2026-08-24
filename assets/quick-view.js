(function () {
  'use strict';

  function getModal() {
    return document.getElementById('QuickViewModal');
  }

  function getLoadingEl(modal) {
    return modal ? modal.querySelector('[data-quick-view-loading]') : null;
  }

  function getContentEl(modal) {
    return modal ? modal.querySelector('[data-quick-view-content]') : null;
  }

  var moneyFormat =
    (window.themeStrings && window.themeStrings.moneyFormat) || '${{amount}}';

  function formatMoney(cents) {
    var amount = (Number(cents) / 100).toFixed(2);
    return moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amount);
  }

  var modelViewerLoading = null;
  function ensureModelViewerLoaded() {
    if (customElements.get('model-viewer')) return Promise.resolve();
    if (modelViewerLoading) return modelViewerLoading;

    modelViewerLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.type = 'module';
      script.src =
        'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return modelViewerLoading;
  }

  function mediaHtml(media) {
    if (!media) return '';
    switch (media.media_type) {
      case 'video':
      case 'external_video':
        if (media.host === 'youtube') {
          return (
            '<iframe class="quick-view-modal__media-frame" src="https://www.youtube.com/embed/' +
            media.external_id +
            '" allow="autoplay; encrypted-media" allowfullscreen></iframe>'
          );
        }
        if (media.host === 'vimeo') {
          return (
            '<iframe class="quick-view-modal__media-frame" src="https://player.vimeo.com/video/' +
            media.external_id +
            '" allow="autoplay; fullscreen" allowfullscreen></iframe>'
          );
        }
        if (media.sources && media.sources.length) {
          var src =
            media.sources.find(function (s) {
              return s.mime_type === 'video/mp4';
            }) || media.sources[0];
          return (
            '<video class="quick-view-modal__media-tag" src="' +
            src.url +
            '" controls playsinline></video>'
          );
        }
        return media.preview_image
          ? '<img class="quick-view-modal__media-tag" src="' +
              media.preview_image.src +
              '" alt="">'
          : '';
      case 'model':
        ensureModelViewerLoaded();
        return (
          '<model-viewer class="quick-view-modal__media-tag" src="' +
          ((media.sources && media.sources[0] && media.sources[0].url) || '') +
          '" camera-controls auto-rotate ar></model-viewer>'
        );
      default:
        return (
          '<img class="quick-view-modal__media-tag" src="' +
          ((media.preview_image && media.preview_image.src) || media.src || '') +
          '" alt="' +
          (media.alt || '') +
          '" loading="lazy">'
        );
    }
  }

  function buildContent(product) {
    var modal = getModal();
    var contentEl = getContentEl(modal);
    var loadingEl = getLoadingEl(modal);
    if (!modal || !contentEl) return;

    var media =
      product.media && product.media.length
        ? product.media
        : [
            {
              media_type: 'image',
              preview_image: { src: product.featured_image },
              src: product.featured_image,
            },
          ];
    var variant = product.variants && product.variants[0];
    if (!variant) {
      contentEl.innerHTML =
        '<p class="quick-view-modal__error">Product unavailable.</p>';
      if (loadingEl) loadingEl.hidden = true;
      contentEl.hidden = false;
      return;
    }

    if (
      media.some(function (m) {
        return m.media_type === 'model';
      })
    ) {
      ensureModelViewerLoaded();
    }

    var mediaSlides = media
      .map(function (m, i) {
        return (
          '<div class="quick-view-modal__media-slide' +
          (i === 0 ? ' is-active' : '') +
          '" data-media-index="' +
          i +
          '">' +
          mediaHtml(m) +
          '</div>'
        );
      })
      .join('');

    var mediaThumbs =
      media.length > 1
        ? '<div class="quick-view-modal__thumbs">' +
          media
            .map(function (m, i) {
              var thumbSrc =
                (m.preview_image && m.preview_image.src) || m.src || '';
              return (
                '<button type="button" class="quick-view-modal__thumb' +
                (i === 0 ? ' is-active' : '') +
                '" data-media-thumb="' +
                i +
                '"><img src="' +
                thumbSrc +
                '" alt=""></button>'
              );
            })
            .join('') +
          '</div>'
        : '';

    var optionSelects = '';
    if (product.options_with_values && product.options_with_values.length) {
      optionSelects = product.options_with_values
        .map(function (option, oi) {
          return (
            '<div class="quick-view-modal__option">' +
            '<label>' +
            option.name +
            '</label>' +
            '<select data-option-index="' +
            oi +
            '">' +
            option.values
              .map(function (v) {
                return '<option value="' + v + '">' + v + '</option>';
              })
              .join('') +
            '</select></div>'
          );
        })
        .join('');
    }

    contentEl.dataset.variants = JSON.stringify(product.variants || []);

    contentEl.innerHTML =
      '<div class="quick-view-modal__media">' +
      '<div class="quick-view-modal__media-track">' +
      mediaSlides +
      '</div>' +
      mediaThumbs +
      '</div>' +
      '<div class="quick-view-modal__info">' +
      '<h2 class="quick-view-modal__title">' +
      product.title +
      '</h2>' +
      '<p class="quick-view-modal__price" data-quick-view-price>' +
      formatMoney(variant.price) +
      '</p>' +
      '<form data-quick-view-form>' +
      optionSelects +
      '<input type="hidden" name="id" value="' +
      variant.id +
      '" data-quick-view-variant-id>' +
      '<button type="submit" class="button button--primary" data-quick-view-submit' +
      (variant.available ? '' : ' disabled') +
      '>' +
      (variant.available
        ? (window.themeStrings && window.themeStrings.addToCart) || 'Add to cart'
        : (window.themeStrings && window.themeStrings.soldOut) || 'Sold out') +
      '</button>' +
      '</form>' +
      '<a class="quick-view-modal__full-link" href="/products/' +
      product.handle +
      '">View full details</a>' +
      '</div>';

    if (loadingEl) loadingEl.hidden = true;
    contentEl.hidden = false;
  }

  function openModal(handle) {
    if (!handle) {
      console.warn('[Quick View] Missing product handle');
      return;
    }

    var modal = getModal();
    if (!modal) {
      console.warn(
        '[Quick View] #QuickViewModal not found. Ensure snippets/quick-view-modal.liquid is rendered in theme.liquid.'
      );
      return;
    }

    var loadingEl = getLoadingEl(modal);
    var contentEl = getContentEl(modal);

    if (loadingEl) loadingEl.hidden = false;
    if (contentEl) {
      contentEl.hidden = true;
      contentEl.innerHTML = '';
    }

    try {
      if (typeof modal.showModal === 'function') {
        if (!modal.open) modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }
    } catch (err) {
      modal.setAttribute('open', '');
    }

    modal.classList.add('is-open');
    document.documentElement.classList.add('quick-view-open');

    fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(buildContent)
      .catch(function () {
        if (contentEl) {
          contentEl.innerHTML =
            '<p class="quick-view-modal__error">' +
            ((window.themeStrings && window.themeStrings.quickViewError) ||
              'Unable to load product.') +
            '</p>';
          contentEl.hidden = false;
        }
        if (loadingEl) loadingEl.hidden = true;
      });
  }

  function closeModal() {
    var modal = getModal();
    if (!modal) return;

    try {
      if (typeof modal.close === 'function') {
        modal.close();
      } else {
        modal.removeAttribute('open');
      }
    } catch (e) {
      modal.removeAttribute('open');
    }

    modal.classList.remove('is-open');
    document.documentElement.classList.remove('quick-view-open');
  }

  function onActivate(event) {
    var trigger =
      event.target && event.target.closest
        ? event.target.closest('[data-quick-view-open]')
        : null;
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    var handle =
      trigger.getAttribute('data-product-handle') ||
      (trigger.dataset && trigger.dataset.productHandle) ||
      '';
    openModal(handle);
  }

  document.addEventListener('pointerdown', onActivate, true);
  document.addEventListener('click', onActivate, true);

  document.addEventListener(
    'click',
    function (event) {
      if (event.target.closest('[data-quick-view-close]')) {
        event.preventDefault();
        event.stopPropagation();
        closeModal();
        return;
      }

      var thumb = event.target.closest('[data-media-thumb]');
      if (thumb) {
        var modal = getModal();
        if (!modal) return;
        var index = thumb.getAttribute('data-media-thumb');
        modal.querySelectorAll('[data-media-index]').forEach(function (slide) {
          slide.classList.toggle(
            'is-active',
            slide.getAttribute('data-media-index') === index
          );
        });
        modal
          .querySelectorAll(
            '[data-quick-view-content] .quick-view-modal__thumb'
          )
          .forEach(function (t) {
            t.classList.toggle('is-active', t === thumb);
          });
      }
    },
    true
  );

  document.addEventListener('change', function (event) {
    var select = event.target.closest('[data-option-index]');
    if (!select) return;

    var form = select.closest('[data-quick-view-form]');
    if (!form) return;
    var content = form.closest('[data-quick-view-content]');
    if (!content) return;

    var variants = [];
    try {
      variants = JSON.parse(content.dataset.variants || '[]');
    } catch (e) {}

    var selects = Array.from(form.querySelectorAll('[data-option-index]'));
    var selectedOptions = selects.map(function (s) {
      return s.value;
    });

    var match = variants.find(function (v) {
      return v.options.every(function (opt, i) {
        return opt === selectedOptions[i];
      });
    });

    var variantInput = form.querySelector('[data-quick-view-variant-id]');
    var priceEl = content.querySelector('[data-quick-view-price]');
    var submitBtn = form.querySelector('[data-quick-view-submit]');

    if (match) {
      if (variantInput) variantInput.value = match.id;
      if (priceEl) priceEl.textContent = formatMoney(match.price);
      if (submitBtn) {
        submitBtn.disabled = !match.available;
        submitBtn.textContent = match.available
          ? (window.themeStrings && window.themeStrings.addToCart) ||
            'Add to cart'
          : (window.themeStrings && window.themeStrings.soldOut) || 'Sold out';
      }
    } else if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent =
        (window.themeStrings && window.themeStrings.unavailable) ||
        'Unavailable';
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-quick-view-form]');
    if (!form) return;
    event.preventDefault();

    var variantInput = form.querySelector('[data-quick-view-variant-id]');
    if (!variantInput) return;

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: variantInput.value, quantity: 1 }],
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function () {
        document.dispatchEvent(new CustomEvent('cart:updated'));
        closeModal();
      })
      .catch(function () {});
  });

  document.addEventListener('click', function (event) {
    var modal = getModal();
    if (!modal || !modal.open) return;
    if (event.target === modal) closeModal();
  });

  document.addEventListener('close', function (event) {
    if (event.target && event.target.id === 'QuickViewModal') {
      event.target.classList.remove('is-open');
      document.documentElement.classList.remove('quick-view-open');
    }
  });
})();