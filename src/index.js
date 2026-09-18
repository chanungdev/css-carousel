import { Carousel } from './instance.js';
import { supportsNative } from './support.js';
import { applyFallback } from './fallback.js';

const SELECTOR = '[data-carousel]';

export function init(root) {
  if (root.carousel) return root.carousel;
  const carousel = new Carousel(root);
  if (!supportsNative()) applyFallback(carousel);
  return carousel;
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
