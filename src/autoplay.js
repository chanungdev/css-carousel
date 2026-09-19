import { prefersReducedMotion } from './support.js';

export function applyAutoplay(carousel) {
  const { root } = carousel;
  const delay = Number(root.getAttribute('data-carousel-autoplay'));
  if (!Number.isFinite(delay) || delay <= 0) return;
  if (prefersReducedMotion()) return;

  // 사용자 입력 후 다시 돌기까지의 시간. 없으면 입력 한 번에 영구히 멈춘다.
  const resumeAfter = Number(root.getAttribute('data-carousel-autoplay-resume'));
  const canResume = Number.isFinite(resumeAfter) && resumeAfter > 0;

  // 정지 사유를 각각 따로 추적한다. 하나의 boolean에 여러 사유를 쓰면 나중에
  // 쓴 쪽이 앞선 사유를 덮어써서, hover 중인데도 재생되는 일이 생긴다.
  let hovered = false;
  let focused = false;
  let visible = true;
  let stopped = false;
  let interrupted = false;
  let resumeTimer = null;

  const advance = () => {
    if (stopped || interrupted || hovered || focused || !visible) return;
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
  const onFocusIn = (event) => {
    const target = event.target;
    // 마우스로 버튼·마커를 누르면 브라우저에 따라 포커스가 거기 남는다. 그것까지
    // 정지 사유로 보면 포인터가 떠난 뒤에도 영영 재생되지 않는다. 우리가 만든
    // 컨트롤에 한해 :focus-visible로 키보드 포커스만 골라낸다.
    //
    // 이 판정을 포커스 전반에 적용하면 안 된다 — Chromium은 Tab으로 스크롤
    // 컨테이너에 포커스가 가도 :focus-visible을 주지 않아서, 읽고 있는 키보드
    // 사용자 밑에서 내용이 계속 움직이게 된다.
    const control = target instanceof Element && target.closest('.carousel-button, .carousel-markers');
    focused = control ? target.matches(':focus-visible') : true;
  };
  const onFocusOut = () => {
    focused = false;
  };
  // interrupt()의 영구 정지 경로와 onDestroy() 둘 다 같은 정리를 한다.
  // clearInterval·clearTimeout·disconnect·
  // removeEventListener는 이미 멈춘/제거된 대상에 다시 불러도 아무 일도 안
  // 하므로 두 번 호출해도 안전하다.
  const cleanup = () => {
    clearInterval(timer);
    clearTimeout(resumeTimer);
    io.disconnect();
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('wheel', interrupt);
    root.removeEventListener('pointerdown', interrupt);
  };
  const interrupt = () => {
    if (!canResume) {
      stopped = true;
      // 영구 정지 이후로는 아무 신호도 다시 읽지 않으므로, 배터리·백그라운드
      // 작업을 당장 놓아준다 — carousel이 destroy될 때까지 기다리지 않는다.
      cleanup();
      return;
    }
    // 재시작이 켜져 있으면 리스너를 살려둬야 다음 입력도 잡을 수 있다.
    // 입력이 이어지는 동안에는 카운트다운을 매번 다시 시작해, 마지막 입력
    // 이후로 조용한 시간이 resumeAfter만큼 지나야 다시 돈다.
    interrupted = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      interrupted = false;
    }, resumeAfter);
  };

  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  // 폴백의 버튼·마커는 scroller의 자식이 아니라 형제(root의 자식)다.
  // scroller에만 걸면 그쪽 클릭이 이 리스너에 닿지 않아 정지하지 않는다.
  // root에 걸면 scroller 위 wheel도 버블링으로 그대로 잡힌다.
  root.addEventListener('wheel', interrupt, { passive: true });
  root.addEventListener('pointerdown', interrupt);

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  io.observe(root);

  carousel.onDestroy(cleanup);
}
