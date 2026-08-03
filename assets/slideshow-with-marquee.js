document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="slideshow-with-marquee"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    const slides = section.querySelectorAll('.slideshow-with-marquee__slide');
    const dots = section.querySelectorAll('.slideshow-with-marquee__dot');
    const prevBtn = section.querySelector('.slideshow-with-marquee__control--prev');
    const nextBtn = section.querySelector('.slideshow-with-marquee__control--next');
    
    const autoplay = section.dataset.autoplay === 'true';
    const autoplaySpeed = parseInt(section.dataset.autoplaySpeed) || 5000;
    const slideHeight = parseInt(section.dataset.slideHeight) || 600;
    
    let currentIndex = 0;
    let isAnimating = false;
    let autoplayTimer = null;
    
    // Set slide height
    const slideshow = section.querySelector('.slideshow-with-marquee__slideshow');
    if (slideshow) {
      slideshow.style.setProperty('--slide-height', slideHeight + 'px');
    }
    
    function goTo(index) {
      if (isAnimating || index === currentIndex || index < 0 || index >= slides.length) return;
      
      isAnimating = true;
      
      // Update slides
      slides.forEach(function(slide, i) {
        const isActive = i === index;
        slide.setAttribute('data-active', isActive ? 'true' : 'false');
        slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      
      // Update dots
      dots.forEach(function(dot, i) {
        dot.classList.toggle('slideshow-with-marquee__dot--active', i === index);
        if (i === index) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
      
      currentIndex = index;
      
      setTimeout(function() {
        isAnimating = false;
      }, 800);
    }
    
    function next() {
      const nextIndex = (currentIndex + 1) % slides.length;
      goTo(nextIndex);
    }
    
    function prev() {
      const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
      goTo(prevIndex);
    }
    
    function startAutoplay() {
      if (!autoplay || slides.length <= 1) return;
      stopAutoplay();
      autoplayTimer = setInterval(next, autoplaySpeed);
    }
    
    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }
    
    // Event listeners
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        stopAutoplay();
        prev();
        if (autoplay) startAutoplay();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        stopAutoplay();
        next();
        if (autoplay) startAutoplay();
      });
    }
    
    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        if (index !== currentIndex) {
          stopAutoplay();
          goTo(index);
          if (autoplay) startAutoplay();
        }
      });
    });
    
    // Keyboard navigation
    section.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stopAutoplay();
        prev();
        if (autoplay) startAutoplay();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stopAutoplay();
        next();
        if (autoplay) startAutoplay();
      }
    });
    
    // Pause on hover
    if (section.dataset.stopOnHover === 'true') {
      section.addEventListener('mouseenter', stopAutoplay);
      section.addEventListener('mouseleave', startAutoplay);
    }
    
    // Initialize
    goTo(0);
    if (autoplay) startAutoplay();
    
    // Store instance for cleanup
    section._slideshowInstance = {
      stopAutoplay: stopAutoplay,
      startAutoplay: startAutoplay
    };
  });
});

// Shopify section reload
document.addEventListener('shopify:section:unload', function(e) {
  const section = e.target;
  if (section && section._slideshowInstance) {
    section._slideshowInstance.stopAutoplay();
  }
});

document.addEventListener('shopify:section:load', function(e) {
  const section = e.target;
  if (section && section._slideshowInstance) {
    section._slideshowInstance.startAutoplay();
  }
});