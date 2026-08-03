document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('[data-section-type="sticky-media-cards"]');
  
  sections.forEach(function(section) {
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    
    // Video controls
    const videoWrappers = section.querySelectorAll('.sticky-media-cards__video-wrapper');
    
    videoWrappers.forEach(function(wrapper) {
      const video = wrapper.querySelector('.sticky-media-cards__video');
      const control = wrapper.querySelector('.sticky-media-cards__video-control');
      
      if (!video || !control) return;
      
      // Auto-play with sound off
      video.muted = true;
      video.play().catch(function() {});
      
      control.addEventListener('click', function(e) {
        e.preventDefault();
        if (video.paused) {
          video.play();
          control.classList.remove('is-playing');
        } else {
          video.pause();
          control.classList.add('is-playing');
        }
      });
      
      // Update control icon on play/pause
      video.addEventListener('play', function() {
        control.classList.remove('is-playing');
      });
      
      video.addEventListener('pause', function() {
        control.classList.add('is-playing');
      });
    });
    
    // Intersection Observer for scroll animations
    if ('IntersectionObserver' in window) {
      const cards = section.querySelectorAll('.sticky-media-cards__card-inner');
      
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
          }
        });
      }, {
        threshold: 0.3
      });
      
      cards.forEach(function(card) {
        card.style.animationPlayState = 'paused';
        observer.observe(card);
      });
    }
  });
});