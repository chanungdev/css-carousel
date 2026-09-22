import { test, expect } from '@playwright/test';

// 데모는 문서 역할을 겸한다. check-demo.js가 정적 어긋남을 잡고,
// 여기서는 실제로 열었을 때 살아 있는지를 본다.

const PAGES = [
  { url: '/demo/index.html', theme: 'basic', sections: 9 },
  { url: '/demo/progress.html', theme: 'progress', sections: 2 },
];

const settled = (page) =>
  page.waitForFunction(
    () => {
      const previous = window.__scrollAt;
      window.__scrollAt = window.scrollY;
      return previous === window.scrollY;
    },
    null,
    { polling: 'raf' },
  );

for (const { url, theme, sections } of PAGES) {
  test.describe(`${theme} 페이지`, () => {
    test('콘솔 에러 없이 모든 carousel이 초기화된다', async ({ page }) => {
      const errors = [];
      page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
      page.on('pageerror', (error) => errors.push(String(error)));

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const state = await page.evaluate(() => {
        const roots = [...document.querySelectorAll('[data-carousel]')];
        return {
          carousels: roots.length,
          inited: roots.filter((root) => root.carousel).length,
          brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0)
            .length,
          sections: document.querySelectorAll('section').length,
        };
      });

      expect(errors).toEqual([]);
      expect(state.carousels).toBeGreaterThan(0);
      expect(state.inited).toBe(state.carousels);
      expect(state.brokenImages).toBe(0);
      expect(state.sections).toBe(sections);
    });

    test('테마 메뉴가 현재 페이지를 표시한다', async ({ page }) => {
      await page.goto(url);
      const current = await page.locator('.nav-themes a[aria-current="page"]').textContent();
      expect(current).toBe(theme);
    });
  });
}

test('테마 메뉴로 페이지를 오간다', async ({ page }) => {
  await page.goto('/demo/index.html');
  await page.locator('.nav-themes a', { hasText: 'progress' }).click();
  await expect(page).toHaveURL(/progress\.html$/);

  await page.locator('.nav-themes a', { hasText: 'basic' }).click();
  await expect(page).toHaveURL(/index\.html$/);
});

// sticky 메뉴는 좁은 화면에서 줄바꿈되며 높아진다. 앵커 여백을 고정값으로
// 적어 두면 그때 섹션 머리가 메뉴 밑으로 숨는다.
for (const width of [1100, 520]) {
  test(`앵커로 이동해도 섹션이 메뉴에 가리지 않는다 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/demo/index.html');
    await page.waitForLoadState('networkidle');

    for (const id of ['basics', 'marquee', 'api']) {
      await page.locator(`.nav-sections a[href="#${id}"]`).click();
      await settled(page);

      // 앵커가 가리키는 건 제목이 아니라 섹션이다. 섹션의 위쪽 padding이
      // 여유를 만들어 주므로 제목만 보면 여백이 모자라도 통과해 버린다.
      const geometry = await page.evaluate((section) => {
        const nav = document.querySelector('.nav').getBoundingClientRect();
        const target = document.querySelector(`#${section}`).getBoundingClientRect();
        return { navBottom: nav.bottom, sectionTop: target.top };
      }, id);

      expect(geometry.sectionTop, `#${id}`).toBeGreaterThanOrEqual(geometry.navBottom);
    }
  });
}
