import { test, expect } from '@playwright/test';

test('이펙트가 걸려도 carousel 동작이 유지된다', async ({ page }) => {
  await page.goto('/test/fixtures/effects.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);

  await page.evaluate(() => document.querySelector('#c1').carousel.goTo(2, 'instant'));
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 2);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(2);
});

test('지원 브라우저에서 이펙트 애니메이션이 붙는다', async ({ page }) => {
  await page.goto('/test/fixtures/effects.html');
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  test.skip(!supported, 'scroll-driven animation 미지원 브라우저');

  const style = await page
    .locator('#c1 [data-carousel-scroller] > li')
    .first()
    .evaluate((el) => ({
      name: getComputedStyle(el).animationName,
      timeline: getComputedStyle(el).animationTimeline,
    }));
  expect(style.name).toBe('carousel-fade');
  // animation-name만으로는 animation-timeline이 실제로 view()에 붙었는지 알 수 없다 —
  // 그 규칙만 지워도 animation-name은 그대로 남아 이 검증을 헛것으로 만든다.
  expect(style.timeline).toBe('view(inline)');
});

test('marquee 트랙이 애니메이션된다', async ({ page }) => {
  await page.goto('/test/fixtures/marquee.html');
  const style = await page
    .locator('#m1 [data-carousel-marquee-track]')
    .evaluate((el) => ({
      name: getComputedStyle(el).animationName,
      state: getComputedStyle(el).animationPlayState,
    }));
  expect(style.name).toBe('carousel-marquee');
  expect(style.state).toBe('running');
});

test('marquee는 hover에서 멈춘다', async ({ page }) => {
  await page.goto('/test/fixtures/marquee.html');
  await page.locator('#m1').hover();
  const state = await page
    .locator('#m1 [data-carousel-marquee-track]')
    .evaluate((el) => getComputedStyle(el).animationPlayState);
  expect(state).toBe('paused');
});

test('marquee는 reduced motion에서 멈춘다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/test/fixtures/marquee.html');
  const state = await page
    .locator('#m1 [data-carousel-marquee-track]')
    .evaluate((el) => getComputedStyle(el).animationPlayState);
  expect(state).toBe('paused');
});
