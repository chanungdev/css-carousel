/**
 * 데모용 카드 목록. 이미지는 site/public/cards/*.svg 8장을 돌려 쓴다.
 * 경로는 Astro의 base를 따라간다 — GitHub Pages는 /snapstrip/ 아래로 서빙된다.
 */
const BASE = import.meta.env.BASE_URL;

export const cards = (count: number): string =>
  Array.from(
    { length: count },
    (_, i) => `  <li><img alt="" src="${BASE}cards/0${(i % 8) + 1}.svg"></li>`,
  ).join('\n');

/** 캐러셀 한 벌의 마크업. 이 문자열이 렌더링과 코드 블록 양쪽의 원본이다. */
export const carousel = (attrs: string, count: number): string =>
  `<div ${attrs}>\n  <ul data-carousel-scroller>\n${cards(count)}\n  </ul>\n</div>`;
