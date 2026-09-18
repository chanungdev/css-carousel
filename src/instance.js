import { readVar, scrollBehavior, EDGE_TOLERANCE } from './support.js';

const THRESHOLDS = [0, 0.25, 0.5, 0.75, 1];

export class Carousel {
  constructor(root) {
    const scroller = root.querySelector(':scope > [data-carousel-scroller]');
    if (!scroller) throw new Error('css-carousel: [data-carousel-scroller] 자식이 없습니다');

    this.root = root;
    this.scroller = scroller;
    this.axis = root.getAttribute('data-carousel-axis') === 'block' ? 'block' : 'inline';
    /** loop 모듈이 설정한다. null이면 loop 비활성. */
    this.setSize = null;

    this._slideIndex = 0;
    this._ratios = new Map();
    this._cleanups = [];
    this._io = null;

    this.refresh();
    root.carousel = this;
  }

  get slides() {
    return Array.from(this.scroller.children).filter((el) => el.nodeType === 1);
  }

  /** 마커·연동이 대상으로 삼는 논리 아이템. loop일 때는 가운데 세트. */
  get items() {
    const slides = this.slides;
    return this.setSize ? slides.slice(this.setSize, this.setSize * 2) : slides;
  }

  get index() {
    return this.setSize ? this._slideIndex % this.setSize : this._slideIndex;
  }

  get slideIndex() {
    return this._slideIndex;
  }

  get isInline() {
    return this.axis === 'inline';
  }

  refresh() {
    this._io?.disconnect();
    this._ratios.clear();
    this._io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) this._ratios.set(entry.target, entry.intersectionRatio);
        this._recompute();
      },
      { root: this.scroller, threshold: THRESHOLDS },
    );
    for (const slide of this.slides) this._io.observe(slide);
  }

  _recompute() {
    const slides = this.slides;
    if (slides.length === 0) return;

    const visible = [];
    for (let i = 0; i < slides.length; i += 1) {
      if ((this._ratios.get(slides[i]) ?? 0) > 0) visible.push(i);
    }
    if (visible.length === 0) return;

    const inline = this.isInline;
    const max = inline
      ? this.scroller.scrollWidth - this.scroller.clientWidth
      : this.scroller.scrollHeight - this.scroller.clientHeight;
    // RTL에서 scrollLeft는 음수가 되므로 절댓값으로 비교한다
    const position = Math.abs(inline ? this.scroller.scrollLeft : this.scroller.scrollTop);

    let next;
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
      const anchorOf = (rect) => {
        const start = inline ? rect.left : rect.top;
        const size = inline ? rect.width : rect.height;
        if (align === 'center') return start + size / 2;
        if (align === 'end') return start + size;
        return start;
      };

      const target = anchorOf(this.scroller.getBoundingClientRect());

      let best = Infinity;
      next = this._slideIndex;
      for (const i of visible) {
        const distance = Math.abs(anchorOf(slides[i].getBoundingClientRect()) - target);
        if (distance < best) {
          best = distance;
          next = i;
        }
      }
    }

    if (next === this._slideIndex) return;
    this._slideIndex = next;
    this.root.dispatchEvent(
      new CustomEvent('carousel:change', {
        bubbles: true,
        detail: { index: this.index, slideIndex: this._slideIndex },
      }),
    );
  }

  scrollToSlide(i, behavior = scrollBehavior()) {
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

  next(behavior) {
    this.scrollToSlide(this._slideIndex + 1, behavior);
  }

  prev(behavior) {
    this.scrollToSlide(this._slideIndex - 1, behavior);
  }

  goTo(i, behavior) {
    this.scrollToSlide((this.setSize ?? 0) + i, behavior);
  }

  onDestroy(fn) {
    this._cleanups.push(fn);
  }

  destroy() {
    this._io?.disconnect();
    this._io = null;
    for (const fn of this._cleanups.splice(0)) fn();
    delete this.root.carousel;
  }
}
