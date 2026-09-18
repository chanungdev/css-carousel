import { test, expect } from '@playwright/test';

const ready = async (page) => {
  await page.goto('/test/fixtures/autoplay.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
};

const index = (page) => page.evaluate(() => document.querySelector('#c1').carousel.index);

test('일정 간격으로 다음 아이템으로 넘어간다', async ({ page }) => {
  await ready(page);
  expect(await index(page)).toBe(0);
  // 전진을 검증하는 테스트이므로 고정 대기 대신 상태 변화를 조건 대기한다.
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index > 0, null, { timeout: 3000 });
  expect(await index(page)).toBeGreaterThan(0);
});

test('마지막 아이템 다음에는 처음으로 돌아간다', async ({ page }) => {
  await ready(page);
  // 마지막 인덱스(2)를 지난 뒤 0이 다시 나타나야 순환한 것이다
  await page.waitForFunction(
    () => {
      const seen = window.__seen ?? [];
      const lastItem = seen.indexOf(2);
      return lastItem >= 0 && seen.slice(lastItem + 1).includes(0);
    },
    null,
    { timeout: 5000 },
  );
});

test('hover 중에는 멈춘다', async ({ page }) => {
  await ready(page);
  await page.locator('#c1').hover();
  const before = await index(page);
  // "아무 일도 일어나지 않는다"를 검증하는 테스트라 고정 대기가 맞다: 300ms
  // 간격에 900ms(3틱 분량)를 기다려도 멈춰 있어야 한다.
  await page.waitForTimeout(900);
  expect(await index(page)).toBe(before);
});

test('reduced motion이면 시작하지 않는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  // 위와 동일하게 부재(아무 일도 없음)를 검증하므로 고정 대기가 맞다.
  await page.waitForTimeout(900);
  expect(await index(page)).toBe(0);
});

test('사용자가 스크롤하면 영구히 멈춘다', async ({ page }) => {
  await ready(page);
  await page.locator('#c1 [data-carousel-scroller]').hover();
  await page.mouse.wheel(200, 0);
  // 부재를 검증하는 테스트: 스크롤 직후 상태를 고정 시간만큼 기다려 확정한 뒤,
  // 그 이후로도 더 이상 바뀌지 않아야 한다.
  await page.waitForTimeout(400);
  const after = await index(page);
  await page.waitForTimeout(900);
  expect(await index(page)).toBe(after);
});
