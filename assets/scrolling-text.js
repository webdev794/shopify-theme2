document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="scrolling-text"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    const track = section.querySelector('.scrolling-text__track');
    const pauseOnHover = section.dataset.pauseOnHover === 'true';
    
    if (pauseOnHover && track) {
      section.classList.add('scrolling-text--pause-on-hover');
    }
    
    // Ensure smooth animation on Safari
    if (track) {
      track.addEventListener('animationiteration', function() {
        // Reset transform to avoid jitter
        this.style.animationPlayState = 'paused';
        this.style.transform = 'translateX(0)';
        this.style.animationPlayState = 'running';
      });
    }
    
    // Handle visibility change - pause when tab not visible
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        track.style.animationPlayState = 'paused';
      } else {
        track.style.animationPlayState = 'running';
      }
    });
    
    // Pause on mouse enter (already handled by CSS if class is added)
    // But also handle with JS for extra reliability
    if (pauseOnHover) {
      section.addEventListener('mouseenter', function() {
        track.style.animationPlayState = 'paused';
      });
      
      section.addEventListener('mouseleave', function() {
        track.style.animationPlayState = 'running';
      });
    }
    
    // Debug: Log if animation is running
    console.log('Scrolling text initialized:', {
      items: track ? track.children.length : 0,
      pauseOnHover: pauseOnHover,
      speed: section.dataset.speed || '30s'
    });
  });
});

// Shopify section reload
document.addEventListener('shopify:section:unload', function(e) {
  const section = e.target;
  if (section && section._scrollingText) {
    clearTimeout(section._scrollingText.timer);
  }
});

document.addEventListener('shopify:section:load', function(e) {
  const section = e.target;
  const track = section.querySelector('.scrolling-text__track');
  if (track) {
    // Ensure animation restarts smoothly
    track.style.animationPlayState = 'running';
  }
});