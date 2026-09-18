import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/vertical.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
});

const isNative = (page) => page.evaluate(() => CSS.supports('selector(::scroll-marker)'));

test('아이템 높이가 계산식과 일치한다', async ({ page }) => {
  // (410 + 10) / 2 - 10 = 200
  const height = await page
    .locator('#c1 [data-carousel-scroller] > li')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeCloseTo(200, 1);
});

test('블록 축으로 넘치고 블록 스냅이 걸린다', async ({ page }) => {
  const result = await page.locator('#c1 [data-carousel-scroller]').evaluate((el) => ({
    overflowsBlock: el.scrollHeight > el.clientHeight,
    overflowsInline: el.scrollWidth > el.clientWidth,
    snapType: getComputedStyle(el).scrollSnapType,
  }));
  expect(result.overflowsBlock).toBe(true);
  expect(result.overflowsInline).toBe(false);
  expect(result.snapType).toContain('block');
});

test('goTo가 블록 축으로 스크롤한다', async ({ page }) => {
  await page.evaluate(() => document.querySelector('#c1').carousel.goTo(3, 'instant'));
  await page.waitForFunction(
    () => document.querySelector('#c1 [data-carousel-scroller]').scrollTop > 0,
  );
  const scrollTop = await page.locator('#c1 [data-carousel-scroller]').evaluate((el) => el.scrollTop);
  expect(scrollTop).toBeGreaterThan(0);
});

test('폴백에서 위·아래 화살표가 동작한다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await page.locator('#c1 .carousel-markers').focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 1);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(1);
});

test('폴백 버튼이 블록 축 양끝에서 disabled가 된다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await expect(page.locator('#c1 .carousel-button-prev')).toBeDisabled();
  await page.evaluate(() => {
    const s = document.querySelector('#c1 [data-carousel-scroller]');
    s.scrollTo({ top: s.scrollHeight, behavior: 'instant' });
  });
  await expect(page.locator('#c1 .carousel-button-next')).toBeDisabled();
});
