import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/dynamic.html');
  await page.waitForFunction(() => typeof window.addCarousel === 'function');
});

test('나중에 추가된 carousel이 자동 초기화된다', async ({ page }) => {
  await page.evaluate(() => window.addCarousel('late'));
  await page.waitForFunction(() => !!document.querySelector('#late')?.carousel, null, { timeout: 2000 });
  expect(await page.evaluate(() => document.querySelector('#late').carousel.items.length)).toBe(6);
});

test('제거된 carousel은 정리된다', async ({ page }) => {
  await page.evaluate(() => window.addCarousel('temp'));
  await page.waitForFunction(() => !!document.querySelector('#temp')?.carousel);

  await page.evaluate(() => {
    const root = document.querySelector('#temp');
    window.__destroyed = false;
    root.carousel.onDestroy(() => {
      window.__destroyed = true;
    });
    root.remove();
  });

  await page.waitForFunction(() => window.__destroyed === true);
  expect(await page.evaluate(() => window.__destroyed)).toBe(true);
});

test('같은 요소를 두 번 초기화하지 않는다', async ({ page }) => {
  await page.evaluate(() => window.addCarousel('once'));
  await page.waitForFunction(() => !!document.querySelector('#once')?.carousel);

  const same = await page.evaluate(() => {
    const root = document.querySelector('#once');
    const first = root.carousel;
    window.Carousel.init(root);
    return root.carousel === first;
  });
  expect(same).toBe(true);
});
