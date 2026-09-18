import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
});

const isNative = (page) => page.evaluate(() => CSS.supports('selector(::scroll-marker)'));

test('마커가 아이템 수만큼 생성된다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await expect(page.locator('#c1 .carousel-marker')).toHaveCount(6);
  await expect(page.locator('#c1 .carousel-markers')).toHaveAttribute('role', 'tablist');
  await expect(page.locator('#c1 .carousel-marker').first()).toHaveAttribute('role', 'tab');
});

test('현재 마커만 aria-selected=true다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await expect(page.locator('#c1 .carousel-marker[aria-selected="true"]')).toHaveCount(1);

  await page.evaluate(() => document.querySelector('#c1').carousel.goTo(2, 'instant'));

  await expect(page.locator('#c1 .carousel-marker').nth(2)).toHaveAttribute('aria-selected', 'true');
});

test('마커 클릭이 해당 아이템으로 이동시킨다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await page.locator('#c1 .carousel-marker').nth(3).click();
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 3);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(3);
});

test('roving tabindex가 현재 마커에만 붙는다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  const tabindexes = await page
    .locator('#c1 .carousel-marker')
    .evaluateAll((els) => els.map((el) => el.getAttribute('tabindex')));
  expect(tabindexes).toEqual(['0', '-1', '-1', '-1', '-1', '-1']);
});

test('화살표·Home·End 키가 동작한다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  // 공유 fixture는 --carousel-items:3이라 정렬 앵커가 index 3에서 멈춘다(마지막
  // "페이지"가 이미 화면에 꽉 참). End/Home이 첫·끝 아이템에 닿는지 보려면 한
  // 번에 한 아이템만 보이게 해야 하므로, layout.spec.js와 같은 패턴으로 이
  // 테스트에서만 오버라이드한다.
  await page.locator('#c1').evaluate((el) => el.style.setProperty('--carousel-items', '1'));
  await page.locator('#c1 .carousel-markers').focus();

  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 1);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(1);

  await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 5);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(5);

  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 0);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(0);
});

test('마커 그룹은 --carousel-marker-group-position 위치에 배치된다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  const after = await page.evaluate(() => {
    const scroller = document.querySelector('#c1 [data-carousel-scroller]');
    return scroller.nextElementSibling?.classList.contains('carousel-markers');
  });
  expect(after).toBe(true);
});

test('폴백 마커가 tablist로 노출된다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  const snapshot = await page.locator('#c1').ariaSnapshot();
  expect(snapshot).toContain('tablist');
});

test('네이티브 마커가 tablist로 노출된다', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP는 Chromium 전용');
  test.skip(!(await isNative(page)), '네이티브 미지원 브라우저');

  const session = await context.newCDPSession(page);
  const { nodes } = await session.send('Accessibility.getFullAXTree');
  await session.detach();

  const roles = nodes.map((node) => node.role?.value);
  expect(roles).toContain('tablist');
  expect(roles.filter((role) => role === 'tab')).toHaveLength(6);
});
