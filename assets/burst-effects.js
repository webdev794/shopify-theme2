// burst-effects.js

document.addEventListener('DOMContentLoaded', function() {
  const sections = document.querySelectorAll('.burst-effects');
  
  sections.forEach(function(section) {
    const content = section.querySelector('.burst-effects__content');
    const animation = section.dataset.animation;
    const duration = section.dataset.duration || '1';
    const delay = section.dataset.delay || '0.2';
    const image = section.querySelector('.burst-effects__image');
    
    // Apply animation settings
    if (content && animation !== 'parallax') {
      content.style.animationDuration = duration + 's';
      content.style.animationDelay = delay + 's';
      void content.offsetHeight;
    }
    
    // Parallax effect
    if (animation === 'parallax' && image) {
      function handleParallax() {
        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const centerPoint = rect.top + rect.height / 2;
        const scrollPercent = (centerPoint / windowHeight) - 0.5;
        const translateY = scrollPercent * 40;
        image.style.transform = 'translateY(' + translateY + 'px)';
      }
      
      window.addEventListener('scroll', handleParallax);
      window.addEventListener('resize', handleParallax);
      handleParallax();
    }
  });
});