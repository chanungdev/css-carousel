import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
});

const isNative = (page) => page.evaluate(() => CSS.supports('selector(::scroll-marker)'));

test('지원 브라우저에는 폴백 버튼을 만들지 않는다', async ({ page }) => {
  test.skip(!(await isNative(page)), '미지원 브라우저');
  await expect(page.locator('#c1 .carousel-button')).toHaveCount(0);
});

test('미지원 브라우저에 이전/다음 버튼을 만든다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await expect(page.locator('#c1 .carousel-button')).toHaveCount(2);
  await expect(page.locator('#c1 .carousel-button-prev')).toHaveAttribute('aria-label', 'Previous');
  await expect(page.locator('#c1 .carousel-button-next')).toHaveAttribute('aria-label', 'Next');
});

test('다음 버튼이 한 칸 이동시킨다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await page.locator('#c1 .carousel-button-next').click();
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 1);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(1);
});

test('스크롤 양끝에서 버튼이 disabled가 된다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');

  await expect(page.locator('#c1 .carousel-button-prev')).toBeDisabled();
  await expect(page.locator('#c1 .carousel-button-next')).toBeEnabled();

  await page.evaluate(() => {
    const s = document.querySelector('#c1 [data-carousel-scroller]');
    s.scrollTo({ left: s.scrollWidth, behavior: 'instant' });
  });

  await expect(page.locator('#c1 .carousel-button-prev')).toBeEnabled();
  await expect(page.locator('#c1 .carousel-button-next')).toBeDisabled();
});

test('버튼은 스크롤러 바깥에 있어 함께 스크롤되지 않는다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  const parentIsWrapper = await page.evaluate(
    () => document.querySelector('#c1 .carousel-button-next').parentElement.id === 'c1',
  );
  expect(parentIsWrapper).toBe(true);
});
