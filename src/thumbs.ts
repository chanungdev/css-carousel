import type { Carousel } from './instance.js';

const CURRENT_CLASS = 'carousel-thumb-current';

/** 셀렉터를 실제 carousel 인스턴스로 바꿔주는 콜백. 순환 import를 피하려고 주입받는다. */
export type ResolveCarousel = (selector: string) => Carousel | null;

export function applyThumbs(carousel: Carousel, resolve: ResolveCarousel): void {
  const selector = carousel.root.getAttribute('data-carousel-thumbs');
  if (!selector) return;

  const thumbs = resolve(selector);
  if (!thumbs) return;

  const sync = () => {
    // strip의 아이템 수가 main보다 적으면 carousel.index가 범위를 벗어날 수
    // 있다. goTo()는 이미 clamp하므로(scrollToSlide), 하이라이트도 같은
    // 기준으로 clamp해야 아무 썸네일도 선택되지 않는 상태를 피한다.
    const current = Math.min(carousel.index, thumbs.items.length - 1);
    thumbs.items.forEach((item, i) => {
      item.classList.toggle(CURRENT_CLASS, i === current);
      if (i === current) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    thumbs.goTo(current);
  };

  const onThumbClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const item = target.closest<HTMLElement>('[data-carousel-scroller] > *');
    if (!item) return;
    const i = thumbs.items.indexOf(item);
    if (i >= 0) carousel.goTo(i);
  };

  carousel.root.addEventListener('carousel:change', sync);
  thumbs.scroller.addEventListener('click', onThumbClick);
  sync();

  // main과 strip은 서로 다른 carousel이라 destroy 순서가 어느 쪽이 먼저일지
  // 보장되지 않는다(예: strip이 먼저 DOM에서 제거될 수도 있다). 한쪽에만
  // 등록하면 반대쪽이 먼저 사라졌을 때 이미 destroy된 carousel을 계속
  // 참조하며 sync()·click 리스너가 남는다. 양쪽에 같은 cleanup을 걸어
  // 어느 쪽이 먼저 destroy돼도 둘 다 정리되게 한다. removeEventListener는
  // 이미 제거된 리스너에 다시 불러도 안전하므로 두 번 호출돼도 무해하다.
  const cleanup = () => {
    carousel.root.removeEventListener('carousel:change', sync);
    thumbs.scroller.removeEventListener('click', onThumbClick);
  };
  carousel.onDestroy(cleanup);
  thumbs.onDestroy(cleanup);
}
