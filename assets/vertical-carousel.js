/**
 * Vertical Carousel JavaScript
 * Version: 1.3 - Fixed slide visibility
 */

(function() {
  'use strict';

  function initializeCarousels() {
    const sections = document.querySelectorAll('[data-section-type="vertical-carousel"]');
    sections.forEach(section => {
      if (!section.dataset.initialized) {
        new VerticalCarousel(section);
        section.dataset.initialized = 'true';
      }
    });
  }

  class VerticalCarousel {
    constructor(element) {
      this.element = element;
      this.track = element.querySelector('.vertical-carousel__track');
      this.slides = Array.from(this.track.children);
      this.prevBtn = element.querySelector('.vertical-carousel__nav--prev');
      this.nextBtn = element.querySelector('.vertical-carousel__nav--next');
      this.indicators = element.querySelectorAll('.vertical-carousel__indicator');

      this.autoplay = element.dataset.autoplay === 'true';
      this.autoplaySpeed = parseInt(element.dataset.autoplaySpeed) || 5000;
      this.transitionSpeed = parseInt(element.dataset.transitionSpeed) || 600;
      this.stopOnHover = element.dataset.stopOnHover === 'true';

      this.currentIndex = 0;
      this.isAnimating = false;
      this.autoplayTimer = null;
      this.isPaused = false;

      if (this.slides.length === 0) return;
      this.init();
    }

    init() {
      this.updateSlideVisibility();
      this.updateIndicators();
      this.bindEvents();
      if (this.autoplay) this.startAutoplay();
    }

    bindEvents() {
      this.prevBtn?.addEventListener('click', () => this.prev());
      this.nextBtn?.addEventListener('click', () => this.next());

      this.indicators.forEach(ind => {
        ind.addEventListener('click', (e) => {
          const index = parseInt(e.currentTarget.dataset.index);
          this.goTo(index);
        });
      });

      this.element.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); this.prev(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); this.next(); }
      });

      if (this.stopOnHover && this.autoplay) {
        this.element.addEventListener('mouseenter', () => this.pause());
        this.element.addEventListener('mouseleave', () => this.resume());
      }
    }

    goTo(index) {
      if (this.isAnimating || index < 0 || index >= this.slides.length) return;
      this.isAnimating = true;
      this.currentIndex = index;

      this.track.style.transform = `translateY(-${index * 100}%)`;

      this.updateIndicators();
      this.updateSlideVisibility();

      setTimeout(() => { this.isAnimating = false; }, this.transitionSpeed);
    }

    next() { this.goTo((this.currentIndex + 1) % this.slides.length); }
    prev() { this.goTo((this.currentIndex - 1 + this.slides.length) % this.slides.length); }

    updateSlideVisibility() {
      this.slides.forEach((slide, i) => {
        const isActive = i === this.currentIndex;
        slide.setAttribute('aria-hidden', !isActive);

        if (isActive) {
          slide.style.display = 'flex';
          slide.style.opacity = '1';
          slide.classList.add('vertical-carousel__slide--enter');
          setTimeout(() => slide.classList.remove('vertical-carousel__slide--enter'), this.transitionSpeed);
        } else {
          slide.style.display = 'none';
          slide.style.opacity = '0';
        }
      });
    }

    updateIndicators() {
      this.indicators.forEach((ind, i) => {
        const active = i === this.currentIndex;
        ind.classList.toggle('vertical-carousel__indicator--active', active);
        ind.setAttribute('aria-selected', active);
      });
    }

    startAutoplay() {
      if (this.autoplayTimer) clearInterval(this.autoplayTimer);
      this.autoplayTimer = setInterval(() => {
        if (!this.isPaused) this.next();
      }, this.autoplaySpeed);
    }

    pause() { this.isPaused = true; }
    resume() { this.isPaused = false; }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCarousels);
  } else {
    initializeCarousels();
  }

  document.addEventListener('shopify:section:load', initializeCarousels);
})();