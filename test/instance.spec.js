import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
});

test('auto-init이 인스턴스를 붙인다', async ({ page }) => {
  const ok = await page.evaluate(() => document.querySelector('#c1').carousel instanceof window.Carousel);
  expect(ok).toBe(true);
});

test('초기 인덱스는 0이다', async ({ page }) => {
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(0);
});

test('goTo가 해당 아이템을 스크롤포트 시작에 맞춘다', async ({ page }) => {
  await page.evaluate(() => document.querySelector('#c1').carousel.goTo(3, 'instant'));
  await page.waitForTimeout(100);

  const delta = await page.evaluate(() => {
    const c = document.querySelector('#c1').carousel;
    const s = c.scroller.getBoundingClientRect();
    const i = c.items[3].getBoundingClientRect();
    return i.left - s.left;
  });
  expect(Math.abs(delta)).toBeLessThan(2);
});

test('next / prev가 한 칸씩 이동한다', async ({ page }) => {
  await page.evaluate(() => document.querySelector('#c1').carousel.next('instant'));
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(1);

  await page.evaluate(() => document.querySelector('#c1').carousel.prev('instant'));
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(0);
});

test('인덱스 변경 시 carousel:change가 발생한다', async ({ page }) => {
  const detail = await page.evaluate(async () => {
    const root = document.querySelector('#c1');
    const received = new Promise((resolve) =>
      root.addEventListener('carousel:change', (e) => resolve(e.detail), { once: true }),
    );
    root.carousel.goTo(2, 'instant');
    return received;
  });
  expect(detail).toEqual({ index: 2, slideIndex: 2 });
});

test('destroy가 인스턴스를 제거한다', async ({ page }) => {
  const gone = await page.evaluate(() => {
    const root = document.querySelector('#c1');
    root.carousel.destroy();
    return root.carousel === undefined;
  });
  expect(gone).toBe(true);
});
