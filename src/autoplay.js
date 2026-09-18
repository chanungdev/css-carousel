import { prefersReducedMotion } from './support.js';

export function applyAutoplay(carousel) {
  const { root, scroller } = carousel;
  const delay = Number(root.getAttribute('data-carousel-autoplay'));
  if (!Number.isFinite(delay) || delay <= 0) return;
  if (prefersReducedMotion()) return;

  let paused = false;
  let stopped = false;
  let programmatic = false;

  const advance = () => {
    if (paused || stopped) return;
    programmatic = true;
    if (carousel.setSize) {
      carousel.next();
    } else if (carousel.index >= carousel.items.length - 1) {
      carousel.goTo(0);
    } else {
      carousel.next();
    }
    // 우리가 일으킨 스크롤이 끝날 때까지 사용자 스크롤 감지를 유예한다
    setTimeout(() => {
      programmatic = false;
    }, 700);
  };

  const timer = setInterval(advance, delay);

  const pause = () => {
    paused = true;
  };
  const resume = () => {
    paused = false;
  };
  const stop = () => {
    if (programmatic) return;
    stopped = true;
    clearInterval(timer);
  };

  root.addEventListener('pointerenter', pause);
  root.addEventListener('pointerleave', resume);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', resume);
  scroller.addEventListener('wheel', stop, { passive: true });
  scroller.addEventListener('pointerdown', stop);

  const io = new IntersectionObserver(
    ([entry]) => {
      paused = !entry.isIntersecting;
    },
    { threshold: 0 },
  );
  io.observe(root);

  carousel.onDestroy(() => {
    clearInterval(timer);
    io.disconnect();
    root.removeEventListener('pointerenter', pause);
    root.removeEventListener('pointerleave', resume);
    root.removeEventListener('focusin', pause);
    root.removeEventListener('focusout', resume);
    scroller.removeEventListener('wheel', stop);
    scroller.removeEventListener('pointerdown', stop);
  });
}
