(function () {
  "use strict";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function prefersReducedMotion() { return reducedMotion.matches; }
  function initSkipLinks() {
    document.querySelectorAll("a.skip-link, a.visually-hidden-focusable").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var id = link.getAttribute("href").slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: false });
        target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      });
    });
  }
  var liveRegion;
  function ensureLiveRegion() {
    if (liveRegion) return liveRegion;
    liveRegion = document.getElementById("a11y-live-region");
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.id = "a11y-live-region";
      liveRegion.className = "visually-hidden";
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      document.body.appendChild(liveRegion);
    }
    return liveRegion;
  }
  function announce(message, politeness) {
    var region = ensureLiveRegion();
    region.setAttribute("aria-live", politeness === "assertive" ? "assertive" : "polite");
    region.textContent = "";
    void region.offsetWidth;
    region.textContent = message;
  }
  var lastFocus = null;
  function saveFocus() { lastFocus = document.activeElement; }
  function restoreFocus() { if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} lastFocus = null; }
  window.A11y = { prefersReducedMotion: prefersReducedMotion, announce: announce, saveFocus: saveFocus, restoreFocus: restoreFocus, initSkipLinks: initSkipLinks };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSkipLinks);
  else initSkipLinks();
})();
