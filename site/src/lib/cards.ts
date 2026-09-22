/**
 * 데모용 카드 목록. 이미지는 site/public/cards/*.svg 8장을 돌려 쓴다.
 * 경로는 Astro의 base를 따라간다 — GitHub Pages는 /snapstrip/ 아래로 서빙된다.
 */
const BASE = import.meta.env.BASE_URL;

/** site/public/cards 에 있는 카드 수. 넘어가면 처음부터 다시 돈다. */
export const CARD_COUNT = 10;

export const cards = (count: number): string =>
  Array.from({ length: count }, (_, i) => {
    const name = String((i % CARD_COUNT) + 1).padStart(2, '0');
    return `  <li><img alt="" src="${BASE}cards/${name}.svg"></li>`;
  }).join('\n');

/** 캐러셀 한 벌의 마크업. 이 문자열이 렌더링과 코드 블록 양쪽의 원본이다. */
export const carousel = (attrs: string, count: number): string =>
  `<div ${attrs}>\n  <ul data-carousel-scroller>\n${cards(count)}\n  </ul>\n</div>`;
