import { Carousel } from './instance.js';

const SELECTOR = '[data-carousel]';

export function init(root) {
  return root.carousel ?? new Carousel(root);
}

export function initAll(scope = document) {
  for (const root of scope.querySelectorAll(SELECTOR)) init(root);
}

Carousel.init = init;
Carousel.initAll = initAll;

export { Carousel };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initAll(), { once: true });
} else {
  initAll();
}
