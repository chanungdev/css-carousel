export const supportsNative = () =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('selector(::scroll-marker)');

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const scrollBehavior = () => (prefersReducedMotion() ? 'instant' : 'smooth');

export const readVar = (el, name, fallback) => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};
