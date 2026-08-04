// ========== HEADER JAVASCRIPT ==========
// Premium header functionality with enhanced interactions

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
        closeTimer = setTimeout(() => details.removeAttribute('open'), 200);
      });
    });
  }

  /* --- Sticky header: scrolled shadow + optional hide on scroll down --- */
  if (header.classList.contains('header--sticky')) {
    const hideOnScroll = header.hasAttribute('data-hide-on-scroll');
    let lastY = window.scrollY;
    let ticking = false;
    let isHidden = false;

    const onScroll = () => {
      const y = window.scrollY;
      
      // Toggle scrolled class for shadow effect
      header.classList.toggle('header--scrolled', y > 4);

      if (hideOnScroll) {
        const scrollingDown = y > lastY;
        const panelOpen = header.querySelector('details[open]');
        const focusWithin = header.contains(document.activeElement);

        // Hide when scrolling down past 150px, no panels open, and no focus
        if (scrollingDown && y > 150 && !panelOpen && !focusWithin) {
          if (!isHidden) {
            header.classList.add('header--hidden');
            isHidden = true;
          }
        } 
        // Show when scrolling up or at top
        else if (!scrollingDown || y <= 150) {
          if (isHidden) {
            header.classList.remove('header--hidden');
            isHidden = false;
          }
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
    
    // Initial check on page load
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
        if (searchInput) {
          searchInput.focus();
          // Add subtle animation class
          searchInput.parentElement.classList.add('header__search-form--active');
        }
      } else {
        const searchForm = search.querySelector('.header__search-form');
        if (searchForm) searchForm.classList.remove('header__search-form--active');
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
    results.classList.remove('header__search-results--empty');

    if (!products || !products.length) {
      const emptyLabel = input && input.form ? input.form.dataset.noResultsLabel : '';
      if (emptyLabel) {
        const empty = document.createElement('div');
        empty.className = 'header__search-empty';
        empty.innerHTML = `
          <span class="header__search-empty-icon">🔍</span>
          <p>${emptyLabel}</p>
        `;
        results.appendChild(empty);
        results.classList.add('header__search-results--empty');
      }
      return;
    }

    const list = document.createElement('ul');
    list.className = 'header__search-list list-unstyled';

    products.forEach((product, index) => {
      const item = document.createElement('li');
      item.className = 'header__search-item';
      
      const link = document.createElement('a');
      link.className = 'header__search-result-link';
      link.href = product.url;
      
      // Add subtle delay for staggered animation
      link.style.animationDelay = (index * 50) + 'ms';

      if (product.featured_image && product.featured_image.url) {
        const image = document.createElement('img');
        image.className = 'header__search-result-image';
        const separator = product.featured_image.url.includes('?') ? '&' : '?';
        image.src = product.featured_image.url + separator + 'width=80&height=80&crop=center';
        image.alt = product.featured_image.alt || product.title || '';
        image.width = 40;
        image.height = 40;
        image.loading = 'lazy';
        link.appendChild(image);
      }

      const info = document.createElement('span');
      info.className = 'header__search-result-info';
      
      const title = document.createElement('span');
      title.className = 'header__search-result-title';
      title.textContent = product.title || '';
      
      if (product.price) {
        const price = document.createElement('span');
        price.className = 'header__search-result-price';
        price.textContent = product.price;
        info.appendChild(title);
        info.appendChild(price);
      } else {
        info.appendChild(title);
      }

      link.appendChild(info);
      item.appendChild(link);
      list.appendChild(item);
    });

    const viewAllItem = document.createElement('li');
    viewAllItem.className = 'header__search-item header__search-item--view-all';
    const viewAll = document.createElement('a');
    viewAll.className = 'header__search-view-all';
    viewAll.href = (header.dataset.searchUrl || '/search') + '?q=' + encodeURIComponent(query);
    viewAll.textContent = input ? input.form.dataset.viewAllLabel || 'View all results →' : 'View all results →';
    viewAllItem.appendChild(viewAll);
    list.appendChild(viewAllItem);

    results.appendChild(list);
    
    // Trigger animation
    requestAnimationFrame(() => {
      results.querySelectorAll('.header__search-item').forEach((item, i) => {
        item.style.animation = `searchItemFadeIn 0.4s ease ${i * 0.05}s forwards`;
      });
    });
  };

  if (input && results && predictiveUrl) {
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const query = input.value.trim();

      if (query.length < 2) {
        results.innerHTML = '';
        results.classList.remove('header__search-results--loading');
        return;
      }

      results.classList.add('header__search-results--loading');

      debounceTimer = setTimeout(() => {
        if (abortController) abortController.abort();
        abortController = new AbortController();

        const params = new URLSearchParams({
          q: query,
          'resources[type]': 'product',
          'resources[limit]': '6',
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
            results.classList.remove('header__search-results--loading');
          })
          .catch((error) => {
            if (error.name !== 'AbortError') {
              if (results) {
                results.innerHTML = '';
                results.classList.remove('header__search-results--loading');
              }
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

  /* --- Cart count sync with enhanced animation --- */
  const badge = header.querySelector('[data-cart-count]');
  const badgeText = header.querySelector('[data-cart-count-text]');

  const renderCartCount = (count) => {
    if (typeof count !== 'number') return;
    if (badge) {
      const previousCount = parseInt(badge.textContent, 10) || 0;
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
      
      // Enhanced bump animation
      if (count > 0 && count !== previousCount) {
        badge.classList.remove('header__cart-count--bump');
        // Force reflow
        void badge.offsetWidth;
        badge.classList.add('header__cart-count--bump');
        
        // Show count change with color
        if (count > previousCount) {
          badge.style.color = '#4CAF50';
          setTimeout(() => { badge.style.color = ''; }, 600);
        } else if (count < previousCount) {
          badge.style.color = '#ff6b6b';
          setTimeout(() => { badge.style.color = ''; }, 600);
        }
      }
    }
    if (badgeText) {
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

  // Observe fetch-based cart calls
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0] && args[0].url;
    const result = originalFetch.apply(this, args);
    if (isCartMutation(url)) {
      result.then(syncCartFromServer).catch(() => {});
    }
    return result;
  };

  // Observe XMLHttpRequest-based cart calls
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (isCartMutation(url)) {
      this.addEventListener('loadend', syncCartFromServer);
    }
    return originalXhrOpen.call(this, method, url, ...rest);
  };

  // Pages restored from bfcache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) syncCartFromServer();
  });

  /* --- Add subtle scroll indicator for mobile menu --- */
  const mobileNav = header.querySelector('.header__mobile-nav');
  if (mobileNav) {
    const checkScroll = () => {
      const isScrolled = mobileNav.scrollTop > 10;
      mobileNav.classList.toggle('header__mobile-nav--scrolled', isScrolled);
    };
    mobileNav.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
  }

})();