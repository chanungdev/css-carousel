/** 스크롤 끝/경계 판정에 쓰는 서브픽셀 오차 허용치(px). */
export const EDGE_TOLERANCE = 1;

export const supportsNative = (): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('selector(::scroll-marker)');

/**
 * 페이지 모드의 스냅 대상은 ::column이다. 이게 없으면 스냅 대상이 하나도 없으므로
 * 스크립트가 대신 맞춰야 한다. ::scroll-marker 지원과는 별개로 본다 — 같이 들어온
 * 기능이 아니다.
 */
export const supportsColumns = (): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('selector(::column)');

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'instant' : 'smooth');

export const readVar = (el: Element, name: string, fallback: string): string => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};
