/** 스크롤 끝/경계 판정에 쓰는 서브픽셀 오차 허용치(px). */
export const EDGE_TOLERANCE = 1;

export const supportsNative = (): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('selector(::scroll-marker)');

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'instant' : 'smooth');

export const readVar = (el: Element, name: string, fallback: string): string => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};
