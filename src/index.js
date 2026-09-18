import { Carousel } from './instance.js';
import { supportsNative } from './support.js';
import { applyFallback } from './fallback.js';
import { applyLoop } from './loop.js';

const SELECTOR = '[data-carousel]';
const BATCH_MS = 50;

export function init(root) {
  if (root.carousel) return root.carousel;
  const carousel = new Carousel(root);
  // loop가 슬라이드를 복제한 뒤에 폴백이 마커를 만들어야 한다
  if (root.hasAttribute('data-carousel-loop')) applyLoop(carousel);
  if (!supportsNative()) applyFallback(carousel);
  return carousel;
}

const initSafely = (root) => {
  try {
    init(root);
  } catch (error) {
    // 하나가 잘못 설정돼도 페이지의 나머지 carousel까지 멈추지 않는다.
    console.error('css-carousel:', error);
  }
};

export function initAll(scope = document) {
  for (const root of scope.querySelectorAll(SELECTOR)) initSafely(root);
}

const collect = (node, out) => {
  if (node.nodeType !== 1) return false;
  const before = out.length;
  if (node.matches?.(SELECTOR)) out.push(node);
  for (const nested of node.querySelectorAll?.(SELECTOR) ?? []) out.push(nested);
  return out.length > before;
};

let observer = null;

export function observe() {
  if (observer) return;

  let timer = null;
  const added = [];
  const removed = [];

  observer = new MutationObserver((records) => {
    let matched = false;
    for (const record of records) {
      for (const node of record.addedNodes) if (collect(node, added)) matched = true;
      for (const node of record.removedNodes) if (collect(node, removed)) matched = true;
    }
    // 이미 예약된 flush는 취소하지 않는다. 취소하면 페이지가 계속 바쁠 때
    // flush가 영원히 밀린다 — SPA에서 흔한 상황이다.
    if (!matched || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      for (const root of removed.splice(0)) {
        if (!root.isConnected) root.carousel?.destroy();
      }
      for (const root of added.splice(0)) {
        // 같은 tick에서 wrapper와 그 안의 carousel이 각각 addedNodes로 들어오면
        // 여기서 두 번 push될 수 있지만 무해하다: init()은 root.carousel이 있으면
        // 즉시 반환한다.
        if (root.isConnected) initSafely(root);
      }
    }, BATCH_MS);
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
