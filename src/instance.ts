import { readVar, scrollBehavior, EDGE_TOLERANCE } from './support.js';

const THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

/** `carousel:change`가 싣고 오는 값. */
export interface CarouselChangeDetail {
  /** loop일 때는 한 세트 안에서의 논리 인덱스. */
  index: number;
  /** 복제본을 포함한 실제 슬라이드 인덱스. */
  slideIndex: number;
}

export type CarouselAxis = 'inline' | 'block';

export class Carousel {
  /** 진입점(index.ts)이 채운다. 여기 두면 소비자가 `Carousel.init(el)`로 쓸 수 있다. */
  static init: (root: HTMLElement) => Carousel;
  static initAll: (scope?: ParentNode) => void;

  readonly root: HTMLElement;
  readonly scroller: HTMLElement;
  readonly axis: CarouselAxis;
  /** data-carousel-pages — 슬라이드가 아니라 한 화면씩 넘긴다. */
  readonly isPages: boolean;
  /** loop 모듈이 설정한다. null이면 loop 비활성. */
  setSize: number | null = null;

  private slideIndexValue = 0;
  private readonly ratios = new Map<Element, number>();
  private readonly cleanups: Array<() => void> = [];
  private observer: IntersectionObserver | null = null;

  constructor(root: HTMLElement) {
    const scroller = root.querySelector<HTMLElement>(':scope > [data-carousel-scroller]');
    if (!scroller) throw new Error('snapstrip: [data-carousel-scroller] 자식이 없습니다');

    this.root = root;
    this.scroller = scroller;
    this.axis = root.getAttribute('data-carousel-axis') === 'block' ? 'block' : 'inline';
    this.isPages = root.hasAttribute('data-carousel-pages');

    this.refresh();
    root.carousel = this;
  }

  get slides(): HTMLElement[] {
    return Array.from(this.scroller.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
  }

  /** 마커·연동이 대상으로 삼는 논리 아이템. loop일 때는 가운데 세트. */
  get items(): HTMLElement[] {
    const slides = this.slides;
    return this.setSize ? slides.slice(this.setSize, this.setSize * 2) : slides;
  }

  get index(): number {
    return this.setSize ? this.slideIndexValue % this.setSize : this.slideIndexValue;
  }

  get slideIndex(): number {
    return this.slideIndexValue;
  }

  get isInline(): boolean {
    return this.axis === 'inline';
  }

  /**
   * 페이지 수. 브라우저가 multicol로 나눈 결과를 되읽는 것이라 몇 개로 나뉘었는지
   * 우리가 계산하지 않는다 — 줄 수·아이템 수가 바뀌어도 따라온다.
   */
  get pageCount(): number {
    const viewport = this.isInline ? this.scroller.clientWidth : this.scroller.clientHeight;
    if (!viewport) return 1;
    const total = this.isInline ? this.scroller.scrollWidth : this.scroller.scrollHeight;
    return Math.max(1, Math.round(total / viewport));
  }

  /** 페이지 하나만큼의 스크롤 거리. 페이지 사이 간격은 column-gap이 만든다. */
  private get pageStride(): number {
    const gap = Number.parseFloat(getComputedStyle(this.scroller).columnGap) || 0;
    return (this.isInline ? this.scroller.clientWidth : this.scroller.clientHeight) + gap;
  }

  /**
   * 스크롤이 멈춘 자리에서 가장 가까운 페이지로 맞춘다. 이미 맞아 있으면 아무것도
   * 하지 않는다 — 안 그러면 맞추고 다시 멈추고를 반복한다.
   */
  snapToNearestPage(): void {
    if (!this.isPages) return;
    const stride = this.pageStride;
    if (!stride) return;

    const position = Math.abs(this.isInline ? this.scroller.scrollLeft : this.scroller.scrollTop);
    const nearest = Math.round(position / stride);
    if (Math.abs(position - nearest * stride) <= EDGE_TOLERANCE) return;
    this.scrollToPage(nearest);
  }

  scrollToPage(i: number, behavior: ScrollBehavior = scrollBehavior()): void {
    const target = Math.max(0, Math.min(i, this.pageCount - 1));
    const axis = this.isInline ? 'left' : 'top';
    this.scroller.scrollTo({ [axis]: target * this.pageStride, behavior });
  }

  refresh(): void {
    this.observer?.disconnect();
    this.ratios.clear();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) this.ratios.set(entry.target, entry.intersectionRatio);
        this.recompute();
      },
      { root: this.scroller, threshold: THRESHOLDS },
    );
    this.observer = observer;
    for (const slide of this.slides) observer.observe(slide);
  }

  private setIndex(next: number): void {
    if (next === this.slideIndexValue) return;
    this.slideIndexValue = next;
    this.root.dispatchEvent(
      new CustomEvent<CarouselChangeDetail>('carousel:change', {
        bubbles: true,
        detail: { index: this.index, slideIndex: this.slideIndexValue },
      }),
    );
  }

  private recompute(): void {
    const slides = this.slides;
    if (slides.length === 0) return;

    // 페이지 모드에서는 현재 위치가 곧 인덱스다. 어느 슬라이드가 정렬 지점에
    // 가까운지 따질 필요가 없다 — 스냅 대상이 슬라이드가 아니라 페이지다.
    if (this.isPages) {
      const position = Math.abs(this.isInline ? this.scroller.scrollLeft : this.scroller.scrollTop);
      const stride = this.pageStride;
      if (!stride) return;
      this.setIndex(Math.max(0, Math.min(Math.round(position / stride), this.pageCount - 1)));
      return;
    }

    const visible: number[] = [];
    for (let i = 0; i < slides.length; i += 1) {
      if ((this.ratios.get(slides[i]) ?? 0) > 0) visible.push(i);
    }
    if (visible.length === 0) return;

    const inline = this.isInline;
    const max = inline
      ? this.scroller.scrollWidth - this.scroller.clientWidth
      : this.scroller.scrollHeight - this.scroller.clientHeight;
    // RTL에서 scrollLeft는 음수가 되므로 절댓값으로 비교한다
    const position = Math.abs(inline ? this.scroller.scrollLeft : this.scroller.scrollTop);

    let next: number;
    if (max > EDGE_TOLERANCE && position >= max - EDGE_TOLERANCE) {
      // 스크롤 끝에서는 남은 아이템이 정렬 지점에 도달할 수 없다.
      // 네이티브 ::scroll-marker도 마지막 마커를 현재로 잡으므로 동일하게 맞춘다.
      next = slides.length - 1;
    } else if (max > EDGE_TOLERANCE && position <= EDGE_TOLERANCE) {
      next = 0;
    } else {
      const align = readVar(this.root, '--carousel-align', 'start');

      // 정렬 기준점끼리의 거리로 현재 아이템을 정한다. 한 화면에 여러 아이템이
      // 보일 때 교차 비율은 서브픽셀 렌더링 차이로 뒤집히지만, 기준점 거리는
      // --carousel-align이 실제로 어디에 맞추는지를 그대로 따라간다.
      const anchorOf = (rect: DOMRect): number => {
        const start = inline ? rect.left : rect.top;
        const size = inline ? rect.width : rect.height;
        if (align === 'center') return start + size / 2;
        if (align === 'end') return start + size;
        return start;
      };

      const target = anchorOf(this.scroller.getBoundingClientRect());

      let best = Infinity;
      next = this.slideIndexValue;
      for (const i of visible) {
        const distance = Math.abs(anchorOf(slides[i].getBoundingClientRect()) - target);
        if (distance < best) {
          best = distance;
          next = i;
        }
      }
    }

    this.setIndex(next);
  }

  scrollToSlide(i: number, behavior: ScrollBehavior = scrollBehavior()): void {
    const slides = this.slides;
    if (slides.length === 0) return;
    const target = slides[Math.max(0, Math.min(i, slides.length - 1))];

    const sr = this.scroller.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const inline = this.isInline;

    const delta = inline ? tr.left - sr.left : tr.top - sr.top;
    const viewport = inline ? sr.width : sr.height;
    const size = inline ? tr.width : tr.height;

    const align = readVar(this.root, '--carousel-align', 'start');
    let offset = 0;
    if (align === 'center') offset = (viewport - size) / 2;
    else if (align === 'end') offset = viewport - size;

    const current = inline ? this.scroller.scrollLeft : this.scroller.scrollTop;
    this.scroller.scrollTo({ [inline ? 'left' : 'top']: current + delta - offset, behavior });
  }

  next(behavior?: ScrollBehavior): void {
    if (this.isPages) return this.scrollToPage(this.slideIndexValue + 1, behavior);
    this.scrollToSlide(this.slideIndexValue + 1, behavior);
  }

  prev(behavior?: ScrollBehavior): void {
    if (this.isPages) return this.scrollToPage(this.slideIndexValue - 1, behavior);
    this.scrollToSlide(this.slideIndexValue - 1, behavior);
  }

  goTo(i: number, behavior?: ScrollBehavior): void {
    if (this.isPages) return this.scrollToPage(i, behavior);
    this.scrollToSlide((this.setSize ?? 0) + i, behavior);
  }

  onDestroy(fn: () => void): void {
    this.cleanups.push(fn);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    for (const fn of this.cleanups.splice(0)) fn();
    delete this.root.carousel;
  }
}
