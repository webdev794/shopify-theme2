document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="media-with-text-overlay"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    // Video controls
    const videoWrapper = section.querySelector('.media-with-text-overlay__media--video');
    const videoControl = section.querySelector('.media-with-text-overlay__video-control');
    
    if (videoWrapper && videoControl) {
      const video = videoWrapper.querySelector('.media-with-text-overlay__video');
      
      if (video) {
        // Auto-play with sound off
        video.muted = true;
        video.play().catch(function() {});
        
        videoControl.addEventListener('click', function(e) {
          e.preventDefault();
          if (video.paused) {
            video.play();
            videoControl.classList.remove('is-playing');
          } else {
            video.pause();
            videoControl.classList.add('is-playing');
          }
        });
        
        video.addEventListener('play', function() {
          videoControl.classList.remove('is-playing');
        });
        
        video.addEventListener('pause', function() {
          videoControl.classList.add('is-playing');
        });
      }
    }
    
    // Intersection Observer for animations
    if ('IntersectionObserver' in window) {
      const content = section.querySelector('.media-with-text-overlay__content-inner');
      
      if (content) {
        const observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              // Trigger animation
              content.querySelectorAll('*').forEach(function(el) {
                el.style.animationPlayState = 'running';
              });
            }
          });
        }, {
          threshold: 0.3
        });
        
        // Pause animations initially
        content.querySelectorAll('*').forEach(function(el) {
          el.style.animationPlayState = 'paused';
        });
        
        observer.observe(content);
      }
    }
  });
});

// Shopify section reload
document.addEventListener('shopify:section:load', function(e) {
  const section = e.target;
  const videoWrapper = section.querySelector('.media-with-text-overlay__media--video');
  const video = videoWrapper ? videoWrapper.querySelector('.media-with-text-overlay__video') : null;
  
  if (video) {
    video.muted = true;
    video.play().catch(function() {});
  }
});

document.addEventListener('shopify:section:unload', function(e) {
  const section = e.target;
  const videoWrapper = section.querySelector('.media-with-text-overlay__media--video');
  const video = videoWrapper ? videoWrapper.querySelector('.media-with-text-overlay__video') : null;
  
  if (video) {
    video.pause();
  }
});