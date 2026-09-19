import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/thumbs.html');
  await page.waitForFunction(() => !!document.querySelector('#strip')?.carousel);
});

test('초기 현재 썸네일이 표시된다', async ({ page }) => {
  await expect(page.locator('#strip .carousel-thumb-current')).toHaveCount(1);
  await expect(page.locator('#strip [data-carousel-scroller] > li').first()).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('메인 이동이 썸네일 표시를 바꾼다', async ({ page }) => {
  await page.evaluate(() => document.querySelector('#main').carousel.goTo(4, 'instant'));
  // aria-current 갱신은 carousel:change(IntersectionObserver 비동기 콜백) 이후에
  // 일어난다. toHaveAttribute는 값이 맞을 때까지 자동으로 재시도하므로 고정
  // 대기 없이 그 시점을 기다릴 수 있다.
  await expect(page.locator('#strip [data-carousel-scroller] > li').nth(4)).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('썸네일 클릭이 메인을 이동시킨다', async ({ page }) => {
  await page.locator('#strip [data-carousel-scroller] > li').nth(2).click();
  // 클릭 → carousel.goTo() → smooth 스크롤 → IntersectionObserver 갱신까지는
  // 비동기다. expect.poll로 index가 실제로 2가 될 때까지 재시도한다.
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#main').carousel.index))
    .toBe(2);
});

// strip이 main보다 슬라이드가 적으면 carousel.index가 strip.items 범위를
// 벗어날 수 있다. goTo()는 이미 clamp하는데 하이라이트만 clamp하지 않으면,
// main이 strip 범위 밖 인덱스로 가는 순간부터 어떤 썸네일도 강조되지 않는다.
test('strip이 main보다 슬라이드가 적으면 마지막 썸네일에서 하이라이트가 clamp된다', async ({ page }) => {
  await page.goto('/test/fixtures/thumbs-fewer.html');
  await page.waitForFunction(() => !!document.querySelector('#strip')?.carousel);

  await page.evaluate(() => document.querySelector('#main').carousel.goTo(5, 'instant'));
  // main.index(5)는 strip.items.length-1(2)보다 크다 — clamp되면 마지막
  // 썸네일이 강조되고, 안 되면 아무 것도 강조되지 않는다.
  await expect(page.locator('#strip [data-carousel-scroller] > li').last()).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page.locator('#strip .carousel-thumb-current')).toHaveCount(1);
});
