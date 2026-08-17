// newsletter.js

document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('.newsletter');
  
  sections.forEach(function(section) {
    const style = section.dataset.style || 'default';
    let bgColor = section.dataset.bgColor || '#f8f9fa';
    let textColor = section.dataset.textColor || '#1a1a2e';
    let bgImage = section.dataset.backgroundImage || '';
    
    // ============================================
    // 1. APPLY BACKGROUND IMAGE
    // ============================================
    
    if (style === 'background' && bgImage && bgImage !== '') {
      section.style.backgroundImage = 'url(' + bgImage + ')';
      section.style.backgroundSize = 'cover';
      section.style.backgroundPosition = 'center';
      section.style.backgroundRepeat = 'no-repeat';
      section.style.backgroundColor = 'transparent';
    } else {
      // ============================================
      // 2. APPLY BACKGROUND COLOR
      // ============================================
      
      if (bgColor && bgColor !== '') {
        section.style.backgroundColor = bgColor;
      }
    }
    
    // ============================================
    // 3. APPLY TEXT COLOR - FIXED
    // ============================================
    
    if (textColor && textColor !== '') {
      const heading = section.querySelector('.newsletter__heading');
      const description = section.querySelector('.newsletter__description');
      const socialLabel = section.querySelector('.newsletter__social-label');
      const subheading = section.querySelector('.newsletter__subheading');
      
      // For background style, use white text
      if (style === 'background') {
        if (heading) heading.style.color = '#ffffff';
        if (description) description.style.color = 'rgba(255,255,255,0.9)';
        if (socialLabel) socialLabel.style.color = 'rgba(255,255,255,0.8)';
        if (subheading) subheading.style.color = 'rgba(255,255,255,0.9)';
      } else {
        // Apply custom text color
        if (heading) heading.style.color = textColor;
        if (description) description.style.color = textColor;
        if (socialLabel) socialLabel.style.color = textColor;
        if (subheading) subheading.style.color = textColor;
      }
    }
    
    // ============================================
    // 4. FORM VALIDATION
    // ============================================
    
    const form = section.querySelector('form');
    const input = section.querySelector('.newsletter__input');
    
    if (form && input) {
      input.addEventListener('blur', function() {
        validateEmail(input);
      });
      
      input.addEventListener('input', function() {
        if (input.classList.contains('error')) {
          validateEmail(input);
        }
      });
      
      form.addEventListener('submit', function(e) {
        if (!validateEmail(input)) {
          e.preventDefault();
          input.focus();
        }
      });
    }
    
    function validateEmail(input) {
      const email = input.value.trim();
      const isValid = email !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      
      if (!isValid && email !== '') {
        input.classList.add('error');
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
        return false;
      } else {
        input.classList.remove('error');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        return isValid || email === '';
      }
    }
    
    // ============================================
    // 5. ANIMATE ON SCROLL
    // ============================================
    
    const content = section.querySelector('.newsletter__content');
    if (content) {
      content.style.opacity = '0';
      content.style.transform = 'translateY(30px)';
      content.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '50px'
      });
      
      observer.observe(content);
    }
    
    // ============================================
    // 6. SUCCESS MESSAGE AUTO-HIDE
    // ============================================
    
    const success = section.querySelector('.newsletter__success');
    if (success) {
      setTimeout(function() {
        success.style.opacity = '0';
        success.style.transform = 'translateY(-10px)';
        success.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        setTimeout(function() {
          success.style.display = 'none';
        }, 500);
      }, 5000);
    }
  });
});