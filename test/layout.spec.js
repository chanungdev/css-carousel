import { test, expect } from '@playwright/test';

const widthOf = (page, nth) =>
  page.locator(`#c1 [data-carousel-scroller] > li`).nth(nth).evaluate((el) => el.getBoundingClientRect().width);

test('정수 items는 컨테이너를 정확히 채운다', async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  // (1000 + 20) / 3 - 20 = 320
  expect(await widthOf(page, 0)).toBeCloseTo(320, 1);
});

test('소수 items는 peek을 만든다', async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  await page.locator('#c1').evaluate((el) => el.style.setProperty('--carousel-items', '2.5'));
  // (1000 + 20) / 2.5 - 20 = 388
  expect(await widthOf(page, 0)).toBeCloseTo(388, 1);
});

test('스크롤러는 인라인 축으로 넘친다', async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  const scroller = page.locator('#c1 [data-carousel-scroller]');
  const { scrollWidth, clientWidth } = await scroller.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(scrollWidth).toBeGreaterThan(clientWidth);
});

test('스냅 속성이 적용된다', async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  const snapType = await page
    .locator('#c1 [data-carousel-scroller]')
    .evaluate((el) => getComputedStyle(el).scrollSnapType);
  expect(snapType).toContain('mandatory');
});
