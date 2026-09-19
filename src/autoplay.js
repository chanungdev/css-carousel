import { prefersReducedMotion } from './support.js';

export function applyAutoplay(carousel) {
  const { root } = carousel;
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
  // stop()과 onDestroy() 둘 다 같은 정리를 한다. clearInterval·disconnect·
  // removeEventListener는 이미 멈춘/제거된 대상에 다시 불러도 아무 일도 안
  // 하므로 두 번 호출해도 안전하다.
  const cleanup = () => {
    clearInterval(timer);
    io.disconnect();
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('wheel', stop);
    root.removeEventListener('pointerdown', stop);
  };
  const stop = () => {
    stopped = true;
    // 영구 정지 이후로는 아무 신호도 다시 읽지 않으므로, 배터리·백그라운드
    // 작업을 당장 놓아준다 — carousel이 destroy될 때까지 기다리지 않는다.
    cleanup();
  };

  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  // 폴백의 버튼·마커는 scroller의 자식이 아니라 형제(root의 자식)다.
  // scroller에만 걸면 그쪽 클릭이 이 리스너에 닿지 않아 정지하지 않는다.
  // root에 걸면 scroller 위 wheel도 버블링으로 그대로 잡힌다.
  root.addEventListener('wheel', stop, { passive: true });
  root.addEventListener('pointerdown', stop);

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  io.observe(root);

  carousel.onDestroy(cleanup);
}
