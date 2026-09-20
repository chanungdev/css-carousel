import { EDGE_TOLERANCE } from './support.js';
import type { Carousel } from './instance.js';

const IDLE_MS = 120;

/** 한 세트가 차지하는 스크롤 거리를 실측한다 (gap 포함). */
function measureSetExtent(carousel: Carousel): number {
  const slides = carousel.slides;
  const first = slides[0].getBoundingClientRect();
  // setSize는 applyLoop이 먼저 채운다 — 이 함수는 그 뒤에만 불린다.
  const nextSet = slides[carousel.setSize as number].getBoundingClientRect();
  return carousel.isInline ? nextSet.left - first.left : nextSet.top - first.top;
}

function onSettled(carousel: Carousel, handler: () => void): () => void {
  const { scroller } = carousel;

  if ('onscrollend' in window) {
    scroller.addEventListener('scrollend', handler);
    return () => scroller.removeEventListener('scrollend', handler);
  }

  // scrollend 미지원: 스크롤이 멎은 뒤 IDLE_MS가 지나면 처리한다
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    clearTimeout(timer);
    timer = setTimeout(handler, IDLE_MS);
  };
  scroller.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    clearTimeout(timer);
    scroller.removeEventListener('scroll', onScroll);
  };
}

export function applyLoop(carousel: Carousel): void {
  const { root, scroller } = carousel;
  const mode = root.getAttribute('data-carousel-loop');

  if (mode === 'manual') {
    const total = carousel.slides.length;
    if (total % 3 !== 0) {
      throw new Error('css-carousel: manual loop는 아이템을 정확히 3세트로 렌더해야 합니다');
    }
    carousel.setSize = total / 3;
  } else {
    const originals = carousel.slides;
    carousel.setSize = originals.length;

    const clone = () =>
      originals.map((el) => {
        const copy = el.cloneNode(true) as HTMLElement;
        // cloneNode(true)는 id를 그대로 복제한다. 복제본은 문서에서 유일할
        // 필요가 없으므로(data-carousel-clone + aria-hidden으로 이미 식별됨)
        // 저자가 쓴 id/getElementById/aria-labelledby가 깨지지 않게 지운다.
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach((node: Element) => node.removeAttribute('id'));
        copy.setAttribute('data-carousel-clone', '');
        copy.setAttribute('aria-hidden', 'true');
        // aria-hidden만으로는 안의 링크/버튼이 여전히 tab 순서에 남는다
        // (WCAG 4.1.2 / axe aria-hidden-focus). 클론은 조작 대상이 아니므로
        // inert로 포커스 자체를 막는다.
        copy.setAttribute('inert', '');
        return copy;
      });

    scroller.prepend(...clone());
    scroller.append(...clone());
    carousel.refresh();

    carousel.onDestroy(() => {
      // destroy()는 DOM에 남아있는 carousel에도 호출될 수 있다. 클론을 남겨두면
      // 재초기화 시 이미 3세트인 걸 또 복제해 9세트가 된다.
      scroller.querySelectorAll('[data-carousel-clone]').forEach((node) => node.remove());
      carousel.setSize = null;
    });
  }

  // 가운데 세트에서 시작한다
  carousel.scrollToSlide(carousel.setSize, 'instant');

  const recenter = () => {
    // carousel.slideIndex는 IntersectionObserver가 비동기로 갱신하므로, 짧은
    // 간격으로 scrollToSlide가 연달아 호출되면 아직 최신 위치를 반영하지 못한
    // 값일 수 있다. 실제 scrollLeft/Top을 기준으로 판단해야 이 경합을 피한다.
    const extent = measureSetExtent(carousel);
    // RTL에서는 첫 세트가 오른쪽에 있어 extent가 음수다. 부호(dir)와 크기(span)를
    // 분리해야 한다 — 부호를 버리고 Math.abs만 취하면 어느 쪽으로 밀어야 하는지
    // 알 수 없어 경계 판정이 반대로 동작한다.
    const dir = Math.sign(extent);
    const span = Math.abs(extent);
    const inline = carousel.isInline;
    const raw = inline ? scroller.scrollLeft : scroller.scrollTop;
    // RTL에서 scrollLeft는 음수가 되므로 절댓값으로 비교한다
    const position = Math.abs(raw);

    let shift = 0;
    if (position < span - EDGE_TOLERANCE) shift = span;
    else if (position >= span * 2 - EDGE_TOLERANCE) shift = -span;
    if (shift === 0) return;

    scroller.scrollTo({
      [inline ? 'left' : 'top']: raw + shift * dir,
      behavior: 'instant',
    });
  };

  const stop = onSettled(carousel, recenter);
  carousel.onDestroy(stop);
}
