class ProductRecommendations extends HTMLElement {
  connectedCallback() {
    const url = this.dataset.url;
    if (!url) return;

    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const grid = doc.querySelector('.product-recommendations__grid');

        if (grid && grid.children.length > 0) {
          this.innerHTML = grid.outerHTML;
        } else {
          // No recommendations returned for this product — remove the whole section
          this.closest('.shopify-section')?.remove();
        }
      })
      .catch(() => {
        this.closest('.shopify-section')?.remove();
      });
  }
}

customElements.define('product-recommendations', ProductRecommendations);