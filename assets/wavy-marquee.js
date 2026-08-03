/**
 * Wavy Marquee JavaScript
 * Handles dynamic functionality and performance optimization
 */

(function() {
  'use strict';

  // Use Shopify's DOM ready helper if available
  const ready = function(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  };

  ready(function() {
    initializeMarquees();
  });

  /**
   * Initialize all wavy marquee sections
   */
  function initializeMarquees() {
    const sections = document.querySelectorAll('[data-section-type="wavy-marquee"]');
    
    if (sections.length === 0) return;

    sections.forEach(function(section) {
      new WavyMarquee(section);
    });
  }

  /**
   * WavyMarquee Class
   * Handles individual marquee instances
   */
  class WavyMarquee {
    constructor(element) {
      this.element = element;
      this.track = element.querySelector('.wavy-marquee__track');
      this.sectionId = element.dataset.sectionId;

      if (!this.track) return;

      this.init();
    }

    init() {
      // Ensure smooth animation by checking for visibility
      this.handleVisibility();

      // Add intersection observer for performance
      if ('IntersectionObserver' in window) {
        this.setupIntersectionObserver();
      }

      // Handle resize for responsive adjustments
      this.handleResize();
    }

    /**
     * Setup Intersection Observer to pause animation when off-screen
     */
    setupIntersectionObserver() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.track.style.animationPlayState = 'running';
          } else {
            this.track.style.animationPlayState = 'paused';
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '50px'
      });

      observer.observe(this.element);
    }

    /**
     * Handle visibility change (tab switching)
     */
    handleVisibility() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.track.style.animationPlayState = 'paused';
        } else {
          this.track.style.animationPlayState = 'running';
        }
      });
    }

    /**
     * Handle window resize for responsive adjustments
     */
    handleResize() {
      let resizeTimeout;
      
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this.adjustForMobile();
        }, 250);
      });
    }

    /**
     * Adjust font size for mobile via JavaScript (fallback)
     */
    adjustForMobile() {
      const isMobile = window.innerWidth <= 749;
      const fontSize = this.element.style.getPropertyValue('--marquee-font-size');
      
      if (isMobile) {
        const mobileFontSize = this.element.dataset.mobileFontSize || '16px';
        this.element.style.setProperty('--marquee-mobile-font-size', mobileFontSize);
      }
    }
  }

  /**
   * Handle dynamic content updates (Shopify AJAX cart, etc.)
   */
  document.addEventListener('shopify:section:load', function(event) {
    if (event.detail && event.detail.sectionId) {
      const section = document.querySelector(`[data-section-id="${event.detail.sectionId}"]`);
      if (section && section.dataset.sectionType === 'wavy-marquee') {
        new WavyMarquee(section);
      }
    }
  });

  /**
   * Handle theme editor updates
   */
  document.addEventListener('shopify:block:select', function(event) {
    // Notify that marquee is being edited
  });

  document.addEventListener('shopify:block:deselect', function(event) {
    // Resume normal behavior
  });

})();