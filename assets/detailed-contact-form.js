class DetailedContactForm {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.form = container.querySelector('.detailed-contact-form__form');
    this.submitButton = container.querySelector('.detailed-contact-form__submit');
    this.buttonText = this.submitButton?.querySelector('.button__text');
    this.buttonSpinner = this.submitButton?.querySelector('.button__spinner');
    this.charCountElement = container.querySelector(`#char-count-${this.sectionId}`);
    this.messageField = container.querySelector(`#${this.sectionId}-message`);
    this.phoneField = container.querySelector(`#${this.sectionId}-phone`);
    this.emailField = container.querySelector(`#${this.sectionId}-email`);
    this.subscribeCheckbox = container.querySelector(`#${this.sectionId}-subscribe`);

    this.init();
  }

  init() {
    if (this.form) {
      this.setupFormSubmission();
      this.setupCharacterCounter();
      this.setupPhoneFormatting();
      this.setupFieldValidation();
      this.setupAutoFocus();
    }

    this.handleSuccessMessage();
  }

  setupFormSubmission() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!this.validateForm()) {
        this.shakeInvalidFields();
        return;
      }

      this.setLoadingState(true);

      try {
        const formData = new FormData(this.form);
        
        // Get customer data for newsletter subscription
        const name = formData.get('contact[name]') || '';
        const email = formData.get('contact[email]') || '';
        const phone = formData.get('contact[phone]') || '';
        const isSubscribed = this.subscribeCheckbox?.checked || false;

        // Submit contact form
        const response = await fetch(this.form.action, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (response.ok) {
          // If subscribed, add customer to Shopify
          if (isSubscribed && email) {
            await this.addCustomerToShopify(name, email, phone);
          }
          
          this.handleSuccess();
        } else {
          this.handleError('An error occurred. Please try again.');
        }
      } catch (error) {
        console.error('Form submission error:', error);
        this.handleError('Connection error. Please check your internet connection.');
      } finally {
        this.setLoadingState(false);
      }
    });
  }

  async addCustomerToShopify(name, email, phone) {
    try {
      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create customer via Shopify's Customer API
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          customer: {
            email: email,
            first_name: firstName,
            last_name: lastName,
            phone: phone || undefined,
            accepts_marketing: true,
            marketing_consent: {
              state: 'consented',
              consent_updated_at: new Date().toISOString()
            }
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // If customer already exists, update their marketing preference
        if (response.status === 422) {
          console.log('Customer already exists, updating marketing preference...');
          // Customer already exists - you might want to update their marketing preference
          // This would require a different endpoint
        }
        throw new Error(data.message || 'Failed to add customer');
      }

      console.log('Customer added successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to add customer to Shopify:', error);
      // Don't throw error - contact form already succeeded
    }
  }

  validateForm() {
    const requiredFields = this.form.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalid = null;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('error');
        field.classList.remove('valid');
        isValid = false;
        if (!firstInvalid) firstInvalid = field;
      } else {
        field.classList.remove('error');
        field.classList.add('valid');
      }
    });

    // Validate email format
    if (this.emailField && this.emailField.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.emailField.value)) {
        this.emailField.classList.add('error');
        this.emailField.classList.remove('valid');
        isValid = false;
        if (!firstInvalid) firstInvalid = this.emailField;
      } else {
        this.emailField.classList.remove('error');
        this.emailField.classList.add('valid');
      }
    }

    if (!isValid && firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
  }

  shakeInvalidFields() {
    const invalidFields = this.form.querySelectorAll('.field__input.error');
    invalidFields.forEach(field => {
      field.style.animation = 'none';
      field.offsetHeight;
      field.style.animation = 'shake 0.5s ease';
      setTimeout(() => {
        field.style.animation = '';
      }, 500);
    });
  }

  setupCharacterCounter() {
    if (this.messageField && this.charCountElement) {
      const maxChars = 1000;

      const updateCounter = () => {
        const currentLength = this.messageField.value.length;
        this.charCountElement.textContent = currentLength;

        // Use CSS variables instead of hardcoded colors
        if (currentLength > 900) {
          this.charCountElement.style.color = 'var(--color-error, #c62828)';
        } else if (currentLength > 700) {
          this.charCountElement.style.color = 'var(--color-sale, #c62828)';
        } else {
          this.charCountElement.style.color = 'var(--color-accent-background, #1a1a2e)';
        }

        if (currentLength > maxChars) {
          this.messageField.value = this.messageField.value.slice(0, maxChars);
          this.charCountElement.textContent = maxChars;
        }
      };

      this.messageField.addEventListener('input', updateCounter);
      updateCounter();
    }
  }

  setupPhoneFormatting() {
    if (this.phoneField) {
      this.phoneField.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d\s()+-]/g, '');
        e.target.value = value;
      });
    }
  }

  setupFieldValidation() {
    const fields = this.form.querySelectorAll('.field__input');
    fields.forEach(field => {
      field.addEventListener('blur', () => {
        if (field.required && !field.value.trim()) {
          field.classList.add('error');
          field.classList.remove('valid');
        } else if (field.required && field.value.trim()) {
          field.classList.remove('error');
          field.classList.add('valid');
        }
      });

      field.addEventListener('input', () => {
        if (field.value.trim()) {
          field.classList.remove('error');
          if (field.required) {
            field.classList.add('valid');
          }
        } else {
          field.classList.remove('valid');
        }
      });
    });
  }

  setupAutoFocus() {
    const firstRequired = this.form.querySelector('[required]');
    if (firstRequired && !this.form.querySelector('.form-status--error')) {
      setTimeout(() => {
        firstRequired.focus();
      }, 600);
    }
  }

  handleSuccess() {
    this.form.reset();

    const existingStatus = this.form.querySelector('.form-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.className = 'form-status form-status--success';
    successDiv.setAttribute('role', 'status');
    successDiv.innerHTML = `
      <p style="font-weight: 600; font-size: 1.05rem;">✓ Thank you!</p>
      <p style="margin: 0; opacity: 0.9;">Your message has been sent successfully. We'll get back to you soon.</p>
      ${this.subscribeCheckbox?.checked ? `
        <p style="margin-top: 0.75rem; font-size: 0.9rem; opacity: 0.9;">
          ✓ You've been subscribed to our newsletter
        </p>
      ` : ''}
    `;

    this.form.insertBefore(successDiv, this.form.firstChild);

    if (this.charCountElement) {
      this.charCountElement.textContent = '0';
    }

    this.form.querySelectorAll('.field__input.valid').forEach(el => {
      el.classList.remove('valid');
    });

    // Uncheck subscribe checkbox
    if (this.subscribeCheckbox) {
      this.subscribeCheckbox.checked = false;
    }

    successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        successDiv.style.opacity = '0';
        successDiv.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          if (successDiv.parentNode) {
            successDiv.remove();
          }
        }, 500);
      }
    }, 8000);
  }

  handleError(message) {
    const existingStatus = this.form.querySelector('.form-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-status form-status--error';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.innerHTML = `
      <p style="font-weight: 600; font-size: 1.05rem;">⚠️ ${message}</p>
      <p style="margin: 0; opacity: 0.9;">Please check your input and try again.</p>
    `;

    this.form.insertBefore(errorDiv, this.form.firstChild);
  }

  setLoadingState(loading) {
    if (this.submitButton) {
      this.submitButton.disabled = loading;
    }

    if (this.buttonText) {
      const originalText = this.buttonText.dataset.originalText || this.buttonText.textContent;
      this.buttonText.textContent = loading ? 'Sending...' : originalText;
    }

    if (this.buttonSpinner) {
      this.buttonSpinner.classList.toggle('hidden', !loading);
    }
  }

  handleSuccessMessage() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('contact_posted') === 'true') {
      if (window.history && window.history.replaceState) {
        const newUrl = window.location.pathname + window.location.search.replace(/[?&]contact_posted=true/, '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }
}

// Add shake animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
    20%, 40%, 60%, 80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(styleSheet);

// Initialize
function initDetailedContactForms() {
  document.querySelectorAll('[data-section-type="detailed-contact-form"]').forEach(container => {
    if (!container.dataset.initialized) {
      new DetailedContactForm(container);
      container.dataset.initialized = true;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDetailedContactForms);
} else {
  initDetailedContactForms();
}

if (window.Shopify && Shopify.theme) {
  document.addEventListener('shopify:section:load', (event) => {
    if (event.detail.sectionId) {
      const container = document.querySelector(`[data-section-id="${event.detail.sectionId}"]`);
      if (container && container.dataset.sectionType === 'detailed-contact-form') {
        container.dataset.initialized = false;
        new DetailedContactForm(container);
        container.dataset.initialized = true;
      }
    }
  });

  document.addEventListener('shopify:section:unload', (event) => {
    if (event.detail.sectionId) {
      const container = document.querySelector(`[data-section-id="${event.detail.sectionId}"]`);
      if (container) {
        container.dataset.initialized = false;
      }
    }
  });
}