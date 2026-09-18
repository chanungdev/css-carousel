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

// ::scroll-button()은 pseudo-element라 셀렉터로 잡을 수 없다.
// native.spec.js와 동일하게 wrapper 좌표를 클릭해 스크롤 이동 여부로 검증한다.
test('네이티브: 하단 중앙 클릭 시 블록 축으로 스크롤된다', async ({ page }) => {
  test.skip(!(await isNative(page)), '네이티브 미지원 브라우저');

  const scroller = page.locator('#c1 [data-carousel-scroller]');
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(0);

  const box = await page.locator('#c1').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 24);

  await page.waitForFunction(
    () => document.querySelector('#c1 [data-carousel-scroller]').scrollTop > 0,
  );
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

// 이 fixture는 인라인 축에 overflow가 없어(--carousel-items로 가로는 꽉 채움),
// 좌측 중앙을 클릭해도 억제 여부와 무관하게 scrollLeft가 0에 머문다 — 즉
// 클릭 기반 검증으로는 content: none 억제를 구분할 수 없다(직접 확인함).
// native.spec.js의 '스크롤 버튼은 콘텐츠와 함께 스크롤되지 않는다' 테스트가 이미
// 쓰는 것과 같은 방식으로, 억제되면 computed content가 초기값(normal)으로 되돌아가는
// 것을 읽어 검증한다.
test('네이티브: 블록 축에서는 인라인 축 버튼이 생성되지 않는다', async ({ page }) => {
  test.skip(!(await isNative(page)), '네이티브 미지원 브라우저');

  const content = await page
    .locator('#c1 [data-carousel-scroller]')
    .evaluate((el) => getComputedStyle(el, '::scroll-button(inline-start)').getPropertyValue('content'));
  expect(content).toBe('normal');
});

test('폴백: prev 버튼이 next 버튼보다 위에 있다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');

  const prevBox = await page.locator('#c1 .carousel-button-prev').boundingBox();
  const nextBox = await page.locator('#c1 .carousel-button-next').boundingBox();

  expect(prevBox.y + prevBox.height / 2).toBeLessThan(nextBox.y + nextBox.height / 2);
});

test('폴백: prev·next 버튼이 wrapper 수평 중앙에 정렬된다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');

  const wrapperBox = await page.locator('#c1').boundingBox();
  const prevBox = await page.locator('#c1 .carousel-button-prev').boundingBox();
  const nextBox = await page.locator('#c1 .carousel-button-next').boundingBox();
  const wrapperCenterX = wrapperBox.x + wrapperBox.width / 2;

  expect(Math.abs(prevBox.x + prevBox.width / 2 - wrapperCenterX)).toBeLessThan(3);
  expect(Math.abs(nextBox.x + nextBox.width / 2 - wrapperCenterX)).toBeLessThan(3);
});
