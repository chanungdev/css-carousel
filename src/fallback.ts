import { EDGE_TOLERANCE, supportsColumns } from './support.js';
import type { Carousel } from './instance.js';

type Direction = 'prev' | 'next';

function makeButton(carousel: Carousel, dir: Direction): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `carousel-button carousel-button-${dir}`;
  button.dataset.carouselButton = dir;

  const attr = dir === 'prev' ? 'data-carousel-label-prev' : 'data-carousel-label-next';
  button.setAttribute(
    'aria-label',
    carousel.root.getAttribute(attr) ?? (dir === 'prev' ? 'Previous' : 'Next'),
  );

  // 인스턴스의 next/prev를 그대로 부른다. 슬라이드 단위인지 페이지 단위인지는
  // 거기서 갈린다 — 폴백이 같은 판단을 두 번 하지 않는다.
  button.addEventListener('click', () => {
    if (dir === 'prev') carousel.prev();
    else carousel.next();
  });

  return button;
}

/** 마커가 몇 개인가 — 페이지 모드에서는 페이지 수, 아니면 아이템 수다. */
function markerCount(carousel: Carousel): number {
  return carousel.isPages ? carousel.pageCount : carousel.items.length;
}

function fillMarkers(carousel: Carousel, group: HTMLElement): void {
  for (let i = 0; i < markerCount(carousel); i += 1) {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'carousel-marker';
    marker.setAttribute('role', 'tab');
    // 페이지에는 붙일 요소가 없으므로 data-carousel-label은 아이템 모드 전용이다
    const label = carousel.isPages
      ? null
      : (carousel.items[i]?.getAttribute('data-carousel-label') ?? null);
    marker.setAttribute('aria-label', label ?? String(i + 1));
    marker.setAttribute('aria-selected', String(i === carousel.index));
    marker.tabIndex = i === carousel.index ? 0 : -1;
    marker.addEventListener('click', () => carousel.goTo(i));
    group.append(marker);
  }
}

function buildMarkers(carousel: Carousel): HTMLDivElement {
  const group = document.createElement('div');
  group.className = 'carousel-markers';
  group.setAttribute('role', 'tablist');
  group.tabIndex = -1;
  fillMarkers(carousel, group);
  return group;
}

export function applyFallback(carousel: Carousel): void {
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

  const markers = buildMarkers(carousel);
  const position = getComputedStyle(root)
    .getPropertyValue('--carousel-marker-group-position')
    .trim();
  if (position === 'before') scroller.before(markers);
  else scroller.after(markers);

  const syncMarkers = () => {
    const current = carousel.index;
    const hadFocus = markers.contains(document.activeElement);
    const all = Array.from(markers.querySelectorAll<HTMLElement>('.carousel-marker'));
    all.forEach((marker, i) => {
      marker.setAttribute('aria-selected', String(i === current));
      marker.tabIndex = i === current ? 0 : -1;
    });
    const currentMarker = all[current] ?? null;
    // roving tabindex는 focus가 마커 그룹 안에 있을 때만 따라간다(WAI-ARIA tab
    // 패턴). 그 외에는 스크롤/자동재생만으로 포커스를 가로채면 안 된다.
    if (hadFocus) currentMarker?.focus();
  };
  root.addEventListener('carousel:change', syncMarkers);

  // 페이지 모드에서는 폭이 바뀌면 브라우저가 페이지를 다시 나눈다 — 마커 수도
  // 따라 바뀌어야 한다. 아이템 모드에서는 개수가 고정이라 아무 일도 하지 않는다.
  const syncCount = (): void => {
    if (markers.children.length === markerCount(carousel)) return;
    markers.replaceChildren();
    fillMarkers(carousel, markers);
    syncMarkers();
  };

  const resizeObserver = new ResizeObserver(() => {
    syncDisabled();
    syncCount();
  });
  resizeObserver.observe(scroller);
  syncDisabled();

  const onKeydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select')) return;

    const inline = carousel.isInline;
    const forward = inline ? 'ArrowRight' : 'ArrowDown';
    const backward = inline ? 'ArrowLeft' : 'ArrowUp';

    if (event.key === forward) carousel.next();
    else if (event.key === backward) carousel.prev();
    else if (event.key === 'Home') carousel.goTo(0);
    else if (event.key === 'End') carousel.goTo(markerCount(carousel) - 1);
    else return;

    event.preventDefault();
  };
  root.addEventListener('keydown', onKeydown);

  // ::column이 없으면 페이지 모드에 스냅 대상이 하나도 없다 — 경계는 컬럼에만
  // 걸려 있기 때문이다. 스크롤이 멈춘 뒤 가장 가까운 페이지로 맞춰 같은 결과를 만든다.
  const needsPageSnap = carousel.isPages && !supportsColumns();
  const onScrollEnd = (): void => carousel.snapToNearestPage();
  if (needsPageSnap) scroller.addEventListener('scrollend', onScrollEnd);

  carousel.onDestroy(() => {
    scroller.removeEventListener('scroll', syncDisabled);
    resizeObserver.disconnect();
    prev.remove();
    next.remove();
    root.removeEventListener('carousel:change', syncMarkers);
    root.removeEventListener('keydown', onKeydown);
    if (needsPageSnap) scroller.removeEventListener('scrollend', onScrollEnd);
    markers.remove();
  });
}
