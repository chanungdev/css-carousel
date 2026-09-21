import { Carousel } from './instance.js';
import type { CarouselChangeDetail } from './instance.js';
import { supportsNative } from './support.js';
import { applyFallback } from './fallback.js';
import { applyLoop } from './loop.js';
import { applyAutoplay } from './autoplay.js';
import { applyThumbs } from './thumbs.js';

declare global {
  interface HTMLElement {
    /** auto-init이 붙여주는 인스턴스. 초기화 전이거나 destroy 후에는 없다. */
    carousel?: Carousel;
  }

  interface HTMLElementEventMap {
    'carousel:change': CustomEvent<CarouselChangeDetail>;
  }

  // 이벤트는 버블링한다. document에서 듣는 쪽이 흔하고 README도 그렇게 안내하는데,
  // document는 DocumentEventMap을 쓰므로 따로 확장해야 detail 타입이 붙는다.
  interface DocumentEventMap {
    'carousel:change': CustomEvent<CarouselChangeDetail>;
  }
}

const SELECTOR = '[data-carousel]';
const BATCH_MS = 50;

export function init(root: HTMLElement): Carousel {
  if (root.carousel) return root.carousel;
  const carousel = new Carousel(root);
  // loop가 슬라이드를 복제한 뒤에 폴백이 마커를 만들어야 한다
  if (root.hasAttribute('data-carousel-loop')) applyLoop(carousel);
  if (!supportsNative()) applyFallback(carousel);
  if (root.hasAttribute('data-carousel-autoplay')) applyAutoplay(carousel);
  if (root.hasAttribute('data-carousel-thumbs')) {
    applyThumbs(carousel, (selector) => {
      const target = document.querySelector<HTMLElement>(selector);
      return target ? init(target) : null;
    });
  }
  return carousel;
}

const initSafely = (root: HTMLElement): void => {
  try {
    init(root);
  } catch (error) {
    // 하나가 잘못 설정돼도 페이지의 나머지 carousel까지 멈추지 않는다.
    console.error('snapstrip:', error);
  }
};

export function initAll(scope: ParentNode = document): void {
  for (const root of scope.querySelectorAll<HTMLElement>(SELECTOR)) initSafely(root);
}

const collect = (node: Node, out: HTMLElement[]): boolean => {
  if (!(node instanceof HTMLElement)) return false;
  const before = out.length;
  if (node.matches(SELECTOR)) out.push(node);
  for (const nested of node.querySelectorAll<HTMLElement>(SELECTOR)) out.push(nested);
  return out.length > before;
};

let observer: MutationObserver | null = null;

export function observe(): void {
  if (observer) return;

  let timer: ReturnType<typeof setTimeout> | null = null;
  const added: HTMLElement[] = [];
  const removed: HTMLElement[] = [];

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
export type { CarouselChangeDetail, CarouselAxis } from './instance.js';
export type { ResolveCarousel } from './thumbs.js';

// SSR(Next.js App Router 등)에서는 이 모듈이 document 없이 평가된다.
// document 접근은 브라우저에서만 한다.
if (typeof document !== 'undefined') {
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
}
