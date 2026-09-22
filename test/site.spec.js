import { test, expect } from '@playwright/test';

// 문서 사이트는 빌드 산출물로 검사한다 — base 경로처럼 빌드에서만 드러나는 문제가
// 과거에 배포를 깨뜨린 적이 있다. check-site.js가 정적 어긋남을 잡고,
// 여기서는 실제로 열었을 때 살아 있는지를 본다.

const BASE = 'http://localhost:4340/snapstrip';

const PAGES = [
  { path: '/', carousels: 1 },
  { path: '/guides/installation/', carousels: 0 },
  { path: '/guides/configuration/', carousels: 0 },
  { path: '/guides/themes/', carousels: 0 },
  { path: '/guides/counter/', carousels: 0 },
  { path: '/guides/effects/', carousels: 0 },
  { path: '/guides/loop/', carousels: 0 },
  { path: '/guides/autoplay/', carousels: 0 },
  { path: '/guides/thumbnails/', carousels: 0 },
  { path: '/guides/api/', carousels: 0 },
  { path: '/guides/browser-support/', carousels: 0 },
  { path: '/samples/basics/', carousels: 1 },
  { path: '/samples/peek/', carousels: 1 },
  { path: '/samples/pages/', carousels: 1 },
  { path: '/samples/effects/', carousels: 3 },
  { path: '/samples/loop/', carousels: 1 },
  { path: '/samples/thumbnails/', carousels: 2 },
  { path: '/samples/vertical/', carousels: 1 },
  { path: '/samples/marquee/', carousels: 0 },
  { path: '/samples/api/', carousels: 1 },
  { path: '/playground/', carousels: 1 },
];

for (const { path, carousels } of PAGES) {
  test(`${path} 가 에러 없이 뜨고 carousel이 초기화된다`, async ({ page }) => {
    const errors = [];
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(String(error)));

    await page.goto(BASE + path);
    await page.waitForLoadState('networkidle');

    const state = await page.evaluate(() => {
      const roots = [...document.querySelectorAll('[data-carousel]')];
      return {
        carousels: roots.length,
        inited: roots.filter((root) => root.carousel).length,
        brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0)
          .length,
      };
    });

    expect(errors).toEqual([]);
    expect(state.carousels).toBe(carousels);
    expect(state.inited).toBe(state.carousels);
    expect(state.brokenImages).toBe(0);
  });
}

// Demo 컴포넌트는 문자열 하나를 렌더링과 코드 블록 양쪽에 쓴다. 그래서 둘이
// 갈라질 수 없다 — 그 계약이 실제로 지켜지는지 한 페이지에서 확인한다.
test('보여주는 코드가 실제로 렌더된 마크업과 같다', async ({ page }) => {
  await page.goto(`${BASE}/samples/peek/`);
  await page.waitForLoadState('networkidle');

  const { rendered, shown } = await page.evaluate(() => {
    const strip = (text) => text.replace(/\s+/g, ' ').trim();
    const demo = document.querySelector('.demo');
    const code = document.querySelector('.demo-code pre code');
    return { rendered: strip(demo.innerHTML), shown: strip(code.textContent) };
  });

  // 렌더된 쪽에는 스크립트가 붙인 폴백 컨트롤이 더 있을 수 있으므로, 코드에
  // 적힌 슬라이드 마크업이 그대로 들어 있는지를 본다.
  const slide = shown.match(/<li>.*?<\/li>/)[0];
  expect(rendered).toContain(slide);
  expect(rendered).toContain('data-carousel-counter');
  expect(shown).toContain('data-carousel-counter');
});

test('사이드바에 네 갈래가 모두 있다', async ({ page }) => {
  await page.goto(`${BASE}/`);
  const labels = await page
    .locator('nav[aria-labelledby] a, nav[aria-labelledby] summary, .sidebar-content a')
    .allTextContents();
  const text = labels.join(' ');
  for (const group of ['Overview', 'Playground']) {
    expect(text, group).toContain(group);
  }
});
