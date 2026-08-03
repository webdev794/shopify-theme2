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
      var payload = Array.isArray(items) ? { items: items } : { items: [items] };
      return ThemeUtils.fetchJSON("/cart/add.js", { method: "POST", body: payload });
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
