document.addEventListener('change', (event) => {
  const checkbox = event.target.closest('[data-recipient-checkbox]');
  if (!checkbox) return;

  const wrapper = checkbox.closest('[data-gift-card-recipient-form]');
  const fields = wrapper.querySelector('[data-recipient-fields]');
  const emailInput = wrapper.querySelector('[data-recipient-input]');

  fields.hidden = !checkbox.checked;
  if (emailInput) {
    emailInput.required = checkbox.checked;
  }
});

(function () {
  'use strict';

  function initAll(root) {
    var scope = root && root.querySelectorAll ? root : document;

    scope.querySelectorAll('[data-recipient-offset]').forEach((input) => {
      input.value = new Date().getTimezoneOffset();
    });

    // Restore checked/visible state after a validation error round-trip
    scope.querySelectorAll('[data-gift-card-recipient-form]').forEach((wrapper) => {
      const checkbox = wrapper.querySelector('[data-recipient-checkbox]');
      const fields = wrapper.querySelector('[data-recipient-fields]');
      const emailInput = wrapper.querySelector('[data-recipient-input]');
      if (checkbox && checkbox.checked && fields) {
        fields.hidden = false;
        if (emailInput) emailInput.required = true;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (event) {
    initAll(event.target);
  });
})();
