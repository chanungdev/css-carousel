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

// 버튼·마커·스와이프가 이미 스크롤 가능하다는 신호를 준다. 그 위에 네이티브
// 스크롤바까지 얹히면 마감이 덜 된 것처럼 보이므로 기본값은 숨김이다.
// 숨기는 것은 표시뿐 — 스크롤과 키보드 접근은 그대로다.
test('스크롤바는 기본으로 숨는다', async ({ page, browserName }) => {
  // Firefox 빌드에서는 변수가 auto여도 scrollbar-width 계산값이 늘 none으로 나온다.
  // 관측이 안 되니 여기서는 실패할 수 없는 테스트가 된다.
  test.skip(browserName === 'firefox', 'scrollbar-width 계산값을 관측할 수 없는 브라우저');

  await page.goto('/test/fixtures/basic.html');

  const scroller = page.locator('#c1 [data-carousel-scroller]');
  await expect(scroller).toHaveCSS('scrollbar-width', 'none');

  // 감춘 뒤에도 스크롤 자체는 살아 있어야 한다 — 표시만 없앤 것이다
  const scrollable = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrollable).toBe(true);
});
