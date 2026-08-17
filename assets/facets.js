(function () {
  function onFacetChange(event) {
    var checkbox = event.target.closest('[data-facet-checkbox]');
    if (!checkbox) return;

    var form = checkbox.closest('[data-facets-form]');
    if (!form) return;

    submitForm(form);
  }

  function submitForm(form) {
    // Preserve params that aren't part of this form (e.g. sort_by, q) by
    // merging the current URL's search params with the form's own fields.
    var formData = new FormData(form);
    var params = new URLSearchParams(window.location.search);

    // Drop any existing filter.* params before re-adding the current form state,
    // so unchecking a box actually removes it instead of leaving a stale value.
    Array.from(params.keys()).forEach(function (key) {
      if (key.indexOf('filter.') === 0) params.delete(key);
    });

    formData.forEach(function (value, key) {
      if (value !== '') params.append(key, value);
    });

    window.location.search = params.toString();
  }

  document.addEventListener('change', onFacetChange);

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-facets-form]');
    if (!form) return;
    event.preventDefault();
    submitForm(form);
  });

  // Once JS confirms it's running, hide the manual "Apply" button — checkbox
  // changes already auto-submit, so it's redundant (price range still needs
  // its own submit, handled by the form submit listener above).
  document.querySelectorAll('[data-facets-form]').forEach(function (form) {
    form.classList.add('facets__form--js-enabled');
  });
})();
