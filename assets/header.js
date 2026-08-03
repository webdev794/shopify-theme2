// ========== HEADER JAVASCRIPT ==========
// This file contains all functionality for the header section

(() => {
  const header = document.querySelector('.header');
  if (!header) return;

  const desktopHover = window.matchMedia('(min-width: 990px) and (hover: hover)');
  const desktopWidth = window.matchMedia('(min-width: 990px)');

  /* --- Close open dropdowns on outside click and Escape --- */
  const closeDropdowns = (except) => {
    header
      .querySelectorAll('details[open]')
      .forEach((details) => {
        if (details !== except) details.removeAttribute('open');
      });
  };

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeDropdowns();
  });

  header.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openDetails = event.target.closest('details[open]');
    if (openDetails) {
      openDetails.removeAttribute('open');
      const summary = openDetails.querySelector('summary');
      if (summary) summary.focus();
    }
  });

  /* --- Keep aria-expanded in sync + only one top-level panel open at a time --- */
  header.querySelectorAll('details').forEach((details) => {
    const summary = details.querySelector(':scope > summary');
    if (summary) summary.setAttribute('aria-expanded', String(details.open));

    details.addEventListener('toggle', () => {
      if (summary) summary.setAttribute('aria-expanded', String(details.open));
      // Nested mobile accordions shouldn't close their parent menu
      if (details.open && !details.closest('details[open] details')) {
        closeDropdowns(details);
      }
    });
  });

  /* --- Optional: open desktop dropdowns on hover (with close delay) --- */
  if (header.hasAttribute('data-hover-menus')) {
    header.querySelectorAll('.header__menu-item').forEach((item) => {
      const details = item.querySelector('[data-header-dropdown]');
      if (!details) return;

      let closeTimer = null;

      item.addEventListener('pointerenter', (event) => {
        if (!desktopHover.matches || event.pointerType === 'touch') return;
        clearTimeout(closeTimer);
        if (!details.open) details.setAttribute('open', '');
      });

      item.addEventListener('pointerleave', (event) => {
        if (!desktopHover.matches || event.pointerType === 'touch') return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => details.removeAttribute('open'), 150);
      });
    });
  }

  /* --- Sticky header: scrolled shadow + optional hide on scroll down --- */
  if (header.classList.contains('header--sticky')) {
    const hideOnScroll = header.hasAttribute('data-hide-on-scroll');
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('header--scrolled', y > 4);

      if (hideOnScroll) {
        const scrollingDown = y > lastY;
        const panelOpen = header.querySelector('details[open]');
        const focusWithin = header.contains(document.activeElement);

        if (scrollingDown && y > 150 && !panelOpen && !focusWithin) {
          header.classList.add('header--hidden');
        } else if (!scrollingDown || y <= 150) {
          header.classList.remove('header--hidden');
        }
      }

      lastY = y;
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
    onScroll();
  }

  /* --- Mobile menu: lock body scroll while open, close on desktop resize --- */
  const mobileMenu = header.querySelector('[data-header-mobile-menu]');
  if (mobileMenu) {
    mobileMenu.addEventListener('toggle', () => {
      document.body.classList.toggle('header-mobile-menu-open', mobileMenu.open);
    });

    const onDesktopChange = (event) => {
      if (event.matches && mobileMenu.open) mobileMenu.removeAttribute('open');
    };
    if (desktopWidth.addEventListener) {
      desktopWidth.addEventListener('change', onDesktopChange);
    } else if (desktopWidth.addListener) {
      desktopWidth.addListener(onDesktopChange);
    }
  }

  /* --- Focus search input when search panel opens --- */
  const search = header.querySelector('[data-header-search]');
  if (search) {
    search.addEventListener('toggle', () => {
      if (search.open) {
        const searchInput = search.querySelector('[data-predictive-search-input]');
        if (searchInput) searchInput.focus();
      }
    });
  }

  /* --- Predictive search --- */
  const input = header.querySelector('[data-predictive-search-input]');
  const results = header.querySelector('[data-predictive-search-results]');
  const predictiveUrl = header.dataset.predictiveSearchUrl;
  let abortController = null;
  let debounceTimer = null;

  const renderResults = (products, query) => {
    if (!results) return;
    results.innerHTML = '';

    if (!products || !products.length) {
      const emptyLabel = input && input.form ? input.form.dataset.noResultsLabel : '';
      if (emptyLabel) {
        const empty = document.createElement('span');
        empty.className = 'header__search-empty';
        empty.textContent = emptyLabel;
        results.appendChild(empty);
      }
      return;
    }

    const list = document.createElement('ul');
    list.className = 'list-unstyled';

    products.forEach((product) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'header__search-result-link';
      link.href = product.url;

      if (product.featured_image && product.featured_image.url) {
        const image = document.createElement('img');
        image.className = 'header__search-result-image';
        const separator = product.featured_image.url.includes('?') ? '&' : '?';
        image.src = product.featured_image.url + separator + 'width=80';
        image.alt = product.featured_image.alt || product.title || '';
        image.width = 40;
        image.height = 40;
        image.loading = 'lazy';
        link.appendChild(image);
      }

      const title = document.createElement('span');
      title.textContent = product.title || '';
      link.appendChild(title);

      item.appendChild(link);
      list.appendChild(item);
    });

    const viewAllItem = document.createElement('li');
    const viewAll = document.createElement('a');
    viewAll.className = 'header__search-view-all';
    viewAll.href = (header.dataset.searchUrl || '/search') + '?q=' + encodeURIComponent(query);
    viewAll.textContent = input ? input.form.dataset.viewAllLabel || 'View all results' : 'View all results';
    viewAllItem.appendChild(viewAll);
    list.appendChild(viewAllItem);

    results.appendChild(list);
  };

  if (input && results && predictiveUrl) {
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();

      if (query.length < 2) {
        results.innerHTML = '';
        return;
      }

      debounceTimer = setTimeout(() => {
        if (abortController) abortController.abort();
        abortController = new AbortController();

        const params = new URLSearchParams({
          q: query,
          'resources[type]': 'product',
          'resources[limit]': '5',
          'resources[options][unavailable_products]': 'last',
        });

        fetch(predictiveUrl + '.json?' + params.toString(), { signal: abortController.signal })
          .then((response) => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
          })
          .then((data) => {
            const products = (data.resources && data.resources.results && data.resources.results.products) || [];
            renderResults(products, query);
          })
          .catch((error) => {
            if (error.name !== 'AbortError') {
              if (results) results.innerHTML = '';
            }
          });
      }, 300);
    });
  }

  /* --- Localization selectors submit on change --- */
  header.querySelectorAll('[data-localization-select]').forEach((select) => {
    select.addEventListener('change', () => {
      const form = select.closest('form');
      if (form) form.submit();
    });
  });

  /* --- Cart count sync ---
     The badge is server-rendered, so without JS it only changes on page
     load. This block keeps it live for every way the cart can change:
     1. `cart:updated` events dispatched by theme code (e.g. quick add)
     2. ANY AJAX call to the cart endpoints — including from third-party
        apps — by observing fetch/XHR and re-reading /cart.js
     3. Back/forward-cache restores, which otherwise show a stale count */
  const badge = header.querySelector('[data-cart-count]');
  const badgeText = header.querySelector('[data-cart-count-text]');

  const renderCartCount = (count) => {
    if (typeof count !== 'number') return;
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
      if (count > 0) {
        badge.classList.remove('header__cart-count--bump');
        // Force reflow so the animation can replay on consecutive updates
        void badge.offsetWidth;
        badge.classList.add('header__cart-count--bump');
      }
    }
    if (badgeText) {
      // Optional data-template="[count] items in cart" wins; otherwise
      // swap the number inside the server-rendered text
      if (badgeText.dataset.template) {
        badgeText.textContent = badgeText.dataset.template.replace('[count]', count);
      } else {
        badgeText.textContent = badgeText.textContent.replace(/\d+/, count);
      }
    }
  };

  document.addEventListener('cart:updated', (event) => {
    const detail = event.detail || {};
    const count = typeof detail.item_count === 'number'
      ? detail.item_count
      : detail.cart && typeof detail.cart.item_count === 'number'
        ? detail.cart.item_count
        : null;
    if (count !== null) renderCartCount(count);
  });

  let cartSyncTimer = null;
  const syncCartFromServer = () => {
    clearTimeout(cartSyncTimer);
    // Small debounce: batched cart operations trigger one refresh
    cartSyncTimer = setTimeout(() => {
      fetch('/cart.js', { headers: { Accept: 'application/json' } })
        .then((response) => (response.ok ? response.json() : null))
        .then((cart) => {
          if (cart && typeof cart.item_count === 'number') renderCartCount(cart.item_count);
        })
        .catch(() => {});
    }, 300);
  };

  const CART_MUTATION_ROUTES = ['/cart/add', '/cart/change', '/cart/update', '/cart/clear'];
  const isCartMutation = (url) => {
    if (!url) return false;
    try {
      const pathname = new URL(url, window.location.origin).pathname;
      return CART_MUTATION_ROUTES.some((route) => pathname.startsWith(route));
    } catch (error) {
      return false;
    }
  };

  // Observe fetch-based cart calls (theme code and most apps)
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0] && args[0].url;
    const result = originalFetch.apply(this, args);
    if (isCartMutation(url)) {
      result.then(syncCartFromServer).catch(() => {});
    }
    return result;
  };

  // Observe XMLHttpRequest-based cart calls (older apps)
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (isCartMutation(url)) {
      this.addEventListener('loadend', syncCartFromServer);
    }
    return originalXhrOpen.call(this, method, url, ...rest);
  };

  // Pages restored from the back/forward cache can carry a stale badge
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) syncCartFromServer();
  });
})();
