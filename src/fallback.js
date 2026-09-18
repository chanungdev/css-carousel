const EDGE_TOLERANCE = 1;

function makeButton(carousel, dir) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `carousel-button carousel-button-${dir}`;
  button.dataset.carouselButton = dir;

  const attr = dir === 'prev' ? 'data-carousel-label-prev' : 'data-carousel-label-next';
  button.setAttribute('aria-label', carousel.root.getAttribute(attr) ?? (dir === 'prev' ? 'Previous' : 'Next'));

  button.addEventListener('click', () => {
    carousel.scrollToSlide(carousel.slideIndex + (dir === 'prev' ? -1 : 1));
  });

  return button;
}

export function applyFallback(carousel) {
  const { root, scroller } = carousel;

  const prev = makeButton(carousel, 'prev');
  const next = makeButton(carousel, 'next');
  root.append(prev, next);

  const syncDisabled = () => {
    const inline = carousel.isInline;
    const max = inline
      ? scroller.scrollWidth - scroller.clientWidth
      : scroller.scrollHeight - scroller.clientHeight;
    // RTL에서 scrollLeft는 음수가 되므로 절댓값으로 비교한다
    const pos = Math.abs(inline ? scroller.scrollLeft : scroller.scrollTop);
    prev.disabled = pos <= EDGE_TOLERANCE;
    next.disabled = pos >= max - EDGE_TOLERANCE;
  };

  scroller.addEventListener('scroll', syncDisabled, { passive: true });
  const resizeObserver = new ResizeObserver(syncDisabled);
  resizeObserver.observe(scroller);
  syncDisabled();

  carousel.onDestroy(() => {
    scroller.removeEventListener('scroll', syncDisabled);
    resizeObserver.disconnect();
    prev.remove();
    next.remove();
  });
}
