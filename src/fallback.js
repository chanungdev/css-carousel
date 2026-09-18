import { EDGE_TOLERANCE } from './support.js';

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

function buildMarkers(carousel) {
  const group = document.createElement('div');
  group.className = 'carousel-markers';
  group.setAttribute('role', 'tablist');
  group.tabIndex = -1;

  carousel.items.forEach((item, i) => {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'carousel-marker';
    marker.setAttribute('role', 'tab');
    marker.setAttribute('aria-label', item.getAttribute('data-carousel-label') ?? String(i + 1));
    marker.setAttribute('aria-selected', String(i === carousel.index));
    marker.tabIndex = i === carousel.index ? 0 : -1;
    marker.addEventListener('click', () => carousel.goTo(i));
    group.append(marker);
  });

  return group;
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

  const markers = buildMarkers(carousel);
  const position = getComputedStyle(root).getPropertyValue('--carousel-marker-group-position').trim();
  if (position === 'before') scroller.before(markers);
  else scroller.after(markers);

  const syncMarkers = () => {
    const current = carousel.index;
    const hadFocus = markers.contains(document.activeElement);
    let currentMarker = null;
    markers.querySelectorAll('.carousel-marker').forEach((marker, i) => {
      marker.setAttribute('aria-selected', String(i === current));
      marker.tabIndex = i === current ? 0 : -1;
      if (i === current) currentMarker = marker;
    });
    // roving tabindex는 focus가 마커 그룹 안에 있을 때만 따라간다(WAI-ARIA tab
    // 패턴). 그 외에는 스크롤/자동재생만으로 포커스를 가로채면 안 된다.
    if (hadFocus) currentMarker?.focus();
  };
  root.addEventListener('carousel:change', syncMarkers);

  const onKeydown = (event) => {
    if (event.target.closest('input, textarea, select')) return;

    const inline = carousel.isInline;
    const forward = inline ? 'ArrowRight' : 'ArrowDown';
    const backward = inline ? 'ArrowLeft' : 'ArrowUp';

    if (event.key === forward) carousel.scrollToSlide(carousel.slideIndex + 1);
    else if (event.key === backward) carousel.scrollToSlide(carousel.slideIndex - 1);
    else if (event.key === 'Home') carousel.goTo(0);
    else if (event.key === 'End') carousel.goTo(carousel.items.length - 1);
    else return;

    event.preventDefault();
  };
  root.addEventListener('keydown', onKeydown);

  carousel.onDestroy(() => {
    scroller.removeEventListener('scroll', syncDisabled);
    resizeObserver.disconnect();
    prev.remove();
    next.remove();
    root.removeEventListener('carousel:change', syncMarkers);
    root.removeEventListener('keydown', onKeydown);
    markers.remove();
  });
}
