import { Carousel } from './instance.js';
import { supportsNative } from './support.js';
import { applyFallback } from './fallback.js';

const SELECTOR = '[data-carousel]';
const DEBOUNCE_MS = 50;

export function init(root) {
  if (root.carousel) return root.carousel;
  const carousel = new Carousel(root);
  if (!supportsNative()) applyFallback(carousel);
  return carousel;
}

export function initAll(scope = document) {
  for (const root of scope.querySelectorAll(SELECTOR)) init(root);
}

const collect = (node, out) => {
  if (node.nodeType !== 1) return;
  if (node.matches?.(SELECTOR)) out.push(node);
  for (const nested of node.querySelectorAll?.(SELECTOR) ?? []) out.push(nested);
};

let observer = null;

export function observe() {
  if (observer) return;

  let timer = null;
  const added = [];
  const removed = [];

  observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) collect(node, added);
      for (const node of record.removedNodes) collect(node, removed);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const root of removed.splice(0)) {
        if (!root.isConnected) root.carousel?.destroy();
      }
      for (const root of added.splice(0)) {
        if (root.isConnected) init(root);
      }
    }, DEBOUNCE_MS);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

Carousel.init = init;
Carousel.initAll = initAll;

export { Carousel };

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      initAll();
      observe();
    },
    { once: true },
  );
} else {
  initAll();
  observe();
}
