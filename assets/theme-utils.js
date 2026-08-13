(function (global) {
  "use strict";
  var ThemeUtils = {
    qs: function (s, r) { return (r || document).querySelector(s); },
    qsa: function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); },
    on: function (el, ev, fn, o) { if (!el) return function () {}; el.addEventListener(ev, fn, o || false); return function () { el.removeEventListener(ev, fn, o || false); }; },
    formatMoney: function (cents, format) {
      if (typeof cents === "string") cents = cents.replace(".", "");
      var value = (cents || 0) / 100;
      var fmt = format || (window.theme && window.theme.moneyFormat) || "{{amount}}";
      var amount = value.toFixed(2);
      return fmt.replace(/\{\{\s*amount\s*\}\}/g, amount).replace(/\{\{\s*amount_no_decimals\s*\}\}/g, Math.round(value).toString());
    },
    fetchJSON: function (url, options) {
      var opts = options || {};
      opts.headers = opts.headers || {};
      opts.headers["X-Requested-With"] = "XMLHttpRequest";
      if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(opts.body);
      }
      opts.credentials = opts.credentials || "same-origin";
      return fetch(url, opts).then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (data) {
          var err = new Error(data.description || data.message || res.statusText);
          err.status = res.status; err.data = data; throw err;
        });
        var ct = res.headers.get("Content-Type") || "";
        return ct.indexOf("application/json") !== -1 ? res.json() : res.text();
      });
    },
    getCart: function () { return ThemeUtils.fetchJSON("/cart.js"); },
    addToCart: function (items) {
      var list = Array.isArray(items) ? items : [items];
      // Normalize to {id, quantity} and drop invalid ids (0 / NaN cause 422)
      list = list.map(function (item) {
        if (item && typeof item === "object") {
          return { id: Number(item.id), quantity: Number(item.quantity) || 1 };
        }
        return { id: Number(item), quantity: 1 };
      }).filter(function (item) {
        return item.id && !isNaN(item.id) && item.id > 0;
      });
      if (!list.length) {
        return Promise.reject(Object.assign(new Error("No valid products to add"), { status: 422 }));
      }
      // Add sequentially — bulk add 422s if any single line is invalid
      var chain = Promise.resolve({ items: [], item_count: 0 });
      list.forEach(function (item) {
        chain = chain.then(function (acc) {
          return ThemeUtils.fetchJSON("/cart/add.js", {
            method: "POST",
            body: { items: [item] }
          }).then(function (res) {
            return res;
          }).catch(function (err) {
            // Skip sold-out / invalid lines; continue with others
            console.warn("[Petlio] skip variant", item.id, err && (err.data || err.message));
            return acc;
          });
        });
      });
      return chain.then(function () {
        return ThemeUtils.getCart();
      });
    },
    changeCart: function (line, quantity) {
      return ThemeUtils.fetchJSON("/cart/change.js", { method: "POST", body: { line: line, quantity: quantity } });
    },
    emit: function (name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail || {}, bubbles: true })); },
    publishCart: function (cart) { ThemeUtils.emit("cart:updated", { item_count: cart.item_count, cart: cart }); },
    debounce: function (fn, wait) { var t; return function () { var c = this, a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, wait); }; },
    trapFocus: function (container) {
      var focusable = ThemeUtils.qsa('a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', container);
      if (!focusable.length) return function () {};
      var first = focusable[0], last = focusable[focusable.length - 1];
      function onKey(e) {
        if (e.key !== "Tab") return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      container.addEventListener("keydown", onKey); first.focus();
      return function () { container.removeEventListener("keydown", onKey); };
    },
    lockScroll: function () {
      var scrollY = window.scrollY || window.pageYOffset;
      document.documentElement.style.setProperty("--scroll-lock-top", "-" + scrollY + "px");
      document.body.classList.add("scroll-locked");
      document.body.dataset.scrollY = String(scrollY);
      return function () {
        document.body.classList.remove("scroll-locked");
        window.scrollTo(0, parseInt(document.body.dataset.scrollY || "0", 10));
        delete document.body.dataset.scrollY;
      };
    }
  };
  global.ThemeUtils = ThemeUtils;
  global.theme = global.theme || {};
  global.theme.utils = ThemeUtils;
})(typeof window !== "undefined" ? window : this);
