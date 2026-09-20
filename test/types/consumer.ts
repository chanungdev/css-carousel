/**
 * 배포되는 선언 파일을 소비자 관점에서 검증한다. 실행하지 않고 tsc로만 본다 —
 * `pnpm typecheck:consumer`가 이 파일을 dist/index.d.ts에 대고 컴파일한다.
 *
 * 여기서 깨진다는 건 npm에서 받은 사람의 에디터에서도 깨진다는 뜻이다.
 */
import { Carousel, init, initAll, observe } from '../../dist/index.js';
import type { CarouselChangeDetail, CarouselAxis, ResolveCarousel } from '../../dist/index.js';

const root = document.querySelector<HTMLElement>('[data-carousel]');

if (root) {
  // 진입점 함수들
  const carousel: Carousel = init(root);
  initAll();
  initAll(document.body);
  observe();

  // 정적 메서드
  const viaStatic: Carousel = Carousel.init(root);
  Carousel.initAll();

  // 읽기 전용 속성
  const el: HTMLElement = carousel.root;
  const scroller: HTMLElement = carousel.scroller;
  const axis: CarouselAxis = carousel.axis;
  const inline: boolean = carousel.isInline;
  const slides: HTMLElement[] = carousel.slides;
  const items: HTMLElement[] = carousel.items;
  const index: number = carousel.index;
  const slideIndex: number = carousel.slideIndex;
  const setSize: number | null = carousel.setSize;

  // 메서드. behavior는 선택 인자다.
  carousel.next();
  carousel.prev('instant');
  carousel.goTo(2);
  carousel.goTo(2, 'smooth');
  carousel.scrollToSlide(0);
  carousel.refresh();
  carousel.onDestroy(() => {});
  carousel.destroy();

  void [viaStatic, el, scroller, axis, inline, slides, items, index, slideIndex, setSize];
}

// HTMLElement 전역 확장: auto-init이 붙인 인스턴스를 타입으로 알 수 있다
const maybe: Carousel | undefined = document.body.carousel;
void maybe;

// 이벤트 맵 확장: detail이 any가 아니라 CarouselChangeDetail이어야 한다
document.addEventListener('carousel:change', (event) => {
  const detail: CarouselChangeDetail = event.detail;
  const i: number = detail.index;
  const s: number = detail.slideIndex;
  void [i, s];
});

// thumbs가 주입받는 콜백 타입도 공개 표면이다
const resolve: ResolveCarousel = (selector) => {
  const target = document.querySelector<HTMLElement>(selector);
  return target ? init(target) : null;
};
void resolve;
