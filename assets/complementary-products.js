document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-complementary-placeholder]').forEach((placeholder) => {
    const wrapper = placeholder.closest('.product__complementary');
    if (!wrapper) return;

    const url = wrapper.dataset.url;
    if (!url) return;

    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const grid = doc.querySelector('.product-recommendations__grid');

        if (grid && grid.children.length > 0) {
          placeholder.replaceWith(grid);
          grid.classList.add('product__complementary-grid');
        } else {
          // No complementary products configured for this product — hide the whole block
          wrapper.remove();
        }
      })
      .catch(() => {
        wrapper.remove();
      });
  });
});
