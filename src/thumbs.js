const CURRENT_CLASS = 'carousel-thumb-current';

export function applyThumbs(carousel, resolve) {
  const selector = carousel.root.getAttribute('data-carousel-thumbs');
  if (!selector) return;

  const thumbs = resolve(selector);
  if (!thumbs) return;

  const sync = () => {
    const current = carousel.index;
    thumbs.items.forEach((item, i) => {
      item.classList.toggle(CURRENT_CLASS, i === current);
      if (i === current) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    thumbs.goTo(current);
  };

  const onThumbClick = (event) => {
    const item = event.target.closest('[data-carousel-scroller] > *');
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
