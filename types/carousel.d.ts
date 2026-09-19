export declare class Carousel {
  constructor(root: HTMLElement);

  readonly root: HTMLElement;
  readonly scroller: HTMLElement;
  readonly axis: 'inline' | 'block';
  readonly isInline: boolean;
  /** loop 활성 시 한 세트의 아이템 수, 아니면 null */
  setSize: number | null;

  readonly slides: HTMLElement[];
  readonly items: HTMLElement[];
  readonly index: number;
  readonly slideIndex: number;

  scrollToSlide(i: number, behavior?: ScrollBehavior): void;
  next(behavior?: ScrollBehavior): void;
  prev(behavior?: ScrollBehavior): void;
  goTo(i: number, behavior?: ScrollBehavior): void;
  refresh(): void;
  destroy(): void;
  onDestroy(fn: () => void): void;

  static init(root: HTMLElement): Carousel;
  static initAll(scope?: ParentNode): void;
}

export declare function init(root: HTMLElement): Carousel;
export declare function initAll(scope?: ParentNode): void;
export declare function observe(): void;

export interface CarouselChangeDetail {
  index: number;
  slideIndex: number;
}

declare global {
  interface HTMLElement {
    carousel?: Carousel;
  }
  interface HTMLElementEventMap {
    'carousel:change': CustomEvent<CarouselChangeDetail>;
  }
}
