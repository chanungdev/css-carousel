import { prefersReducedMotion } from './support.js';

export function applyAutoplay(carousel) {
  const { root, scroller } = carousel;
  const delay = Number(root.getAttribute('data-carousel-autoplay'));
  if (!Number.isFinite(delay) || delay <= 0) return;
  if (prefersReducedMotion()) return;

  // 정지 사유를 각각 따로 추적한다. 하나의 boolean에 여러 사유를 쓰면 나중에
  // 쓴 쪽이 앞선 사유를 덮어써서, hover 중인데도 재생되는 일이 생긴다.
  let hovered = false;
  let focused = false;
  let visible = true;
  let stopped = false;

  const advance = () => {
    if (stopped || hovered || focused || !visible) return;
    if (carousel.setSize || carousel.index < carousel.items.length - 1) carousel.next();
    else carousel.goTo(0);
  };

  const timer = setInterval(advance, delay);

  const onPointerEnter = () => {
    hovered = true;
  };
  const onPointerLeave = () => {
    hovered = false;
  };
  const onFocusIn = () => {
    focused = true;
  };
  const onFocusOut = () => {
    focused = false;
  };
  const stop = () => {
    stopped = true;
    clearInterval(timer);
  };

  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  scroller.addEventListener('wheel', stop, { passive: true });
  scroller.addEventListener('pointerdown', stop);

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  io.observe(root);

  carousel.onDestroy(() => {
    clearInterval(timer);
    io.disconnect();
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    scroller.removeEventListener('wheel', stop);
    scroller.removeEventListener('pointerdown', stop);
  });
}
