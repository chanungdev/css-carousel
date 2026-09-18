const IDLE_MS = 120;

/** 한 세트가 차지하는 스크롤 거리를 실측한다 (gap 포함). */
function measureSetExtent(carousel) {
  const slides = carousel.slides;
  const first = slides[0].getBoundingClientRect();
  const nextSet = slides[carousel.setSize].getBoundingClientRect();
  return carousel.isInline ? nextSet.left - first.left : nextSet.top - first.top;
}

function onSettled(carousel, handler) {
  const { scroller } = carousel;

  if ('onscrollend' in window) {
    scroller.addEventListener('scrollend', handler);
    return () => scroller.removeEventListener('scrollend', handler);
  }

  // scrollend 미지원: 스크롤이 멎은 뒤 IDLE_MS가 지나면 처리한다
  let timer = null;
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

export function applyLoop(carousel) {
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
        const copy = el.cloneNode(true);
        // cloneNode(true)는 id를 그대로 복제한다. 복제본은 문서에서 유일할
        // 필요가 없으므로(data-carousel-clone + aria-hidden으로 이미 식별됨)
        // 저자가 쓴 id/getElementById/aria-labelledby가 깨지지 않게 지운다.
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
        copy.setAttribute('data-carousel-clone', '');
        copy.setAttribute('aria-hidden', 'true');
        return copy;
      });

    scroller.prepend(...clone());
    scroller.append(...clone());
    carousel.refresh();
  }

  // 가운데 세트에서 시작한다
  carousel.scrollToSlide(carousel.setSize, 'instant');

  const recenter = () => {
    // carousel.slideIndex는 IntersectionObserver가 비동기로 갱신하므로, 짧은
    // 간격으로 scrollToSlide가 연달아 호출되면 아직 최신 위치를 반영하지 못한
    // 값일 수 있다. 실제 scrollLeft/Top을 기준으로 판단해야 이 경합을 피한다.
    const extent = measureSetExtent(carousel);
    const inline = carousel.isInline;
    const position = inline ? scroller.scrollLeft : scroller.scrollTop;

    let shift = 0;
    if (position < extent - 1) shift = extent;
    else if (position >= extent * 2 - 1) shift = -extent;
    if (shift === 0) return;

    scroller.scrollTo({
      [inline ? 'left' : 'top']: position + shift,
      behavior: 'instant',
    });
  };

  const stop = onSettled(carousel, recenter);
  carousel.onDestroy(stop);
}
