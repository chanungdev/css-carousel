import { test, expect } from '@playwright/test';

const nativeOnly = async (page) =>
  page.evaluate(() => CSS.supports('selector(::scroll-marker)'));

test.describe('네이티브 CSS carousel (스크립트 없음)', () => {
  test('스크롤 버튼이 생성되고 스크롤을 이동시킨다', async ({ page }) => {
    await page.goto('/test/fixtures/no-js.html');
    test.skip(!(await nativeOnly(page)), 'native scroll button 미지원 브라우저');

    const scroller = page.locator('#c1 [data-carousel-scroller]');
    const before = await scroller.evaluate((el) => el.scrollLeft);

    // 스크롤 버튼은 pseudo-element라 셀렉터로 잡을 수 없다. 좌표로 클릭한다.
    const box = await page.locator('#c1').boundingBox();
    await page.mouse.click(box.x + box.width - 24, box.y + box.height / 2);
    await page.waitForTimeout(600);

    const after = await scroller.evaluate((el) => el.scrollLeft);
    expect(after).toBeGreaterThan(before);
  });

  test('스크롤 버튼은 콘텐츠와 함께 스크롤되지 않는다', async ({ page }) => {
    await page.goto('/test/fixtures/no-js.html');
    test.skip(!(await nativeOnly(page)), 'native scroll button 미지원 브라우저');

    const readButtonX = () =>
      page.locator('#c1').evaluate((el) => {
        const style = getComputedStyle(el, '::scroll-button(inline-end)');
        return style.getPropertyValue('content');
      });

    // content가 비어 있지 않아야 버튼이 생성된 것이다
    expect(await readButtonX()).not.toBe('none');

    const scroller = page.locator('#c1 [data-carousel-scroller]');
    await scroller.evaluate((el) => el.scrollTo({ left: 400, behavior: 'instant' }));
    await page.waitForTimeout(100);

    // 버튼이 스크롤을 따라갔다면 wrapper 오른쪽 끝 클릭이 더 이상 버튼에 닿지 않는다
    const box = await page.locator('#c1').boundingBox();
    const before = await scroller.evaluate((el) => el.scrollLeft);
    await page.mouse.click(box.x + box.width - 24, box.y + box.height / 2);
    await page.waitForTimeout(600);
    const after = await scroller.evaluate((el) => el.scrollLeft);
    expect(after).toBeGreaterThan(before);
  });

  test('마커 그룹이 아이템 수만큼 생성된다', async ({ page }) => {
    await page.goto('/test/fixtures/no-js.html');
    test.skip(!(await nativeOnly(page)), 'native scroll marker 미지원 브라우저');

    const group = await page
      .locator('#c1 [data-carousel-scroller]')
      .evaluate((el) => getComputedStyle(el).scrollMarkerGroup);
    expect(group).toContain('after');

    const markerContent = await page
      .locator('#c1 [data-carousel-scroller] > li')
      .first()
      .evaluate((el) => getComputedStyle(el, '::scroll-marker').getPropertyValue('content'));
    expect(markerContent).not.toBe('none');
  });
});

/**
 * 스크롤러가 한 번 이동하는 동안 관측되는 서로 다른 scrollLeft 값의 개수.
 * 즉시 이동이면 출발값과 도착값 2개뿐이고, 애니메이션되면 중간 프레임만큼 늘어난다.
 */
const distinctScrollSteps = (page, duration) =>
  page.evaluate(async (ms) => {
    const scroller = document.querySelector('#c1 [data-carousel-scroller]');
    const seen = [];
    const start = performance.now();
    while (performance.now() - start < ms) {
      seen.push(Math.round(scroller.scrollLeft));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return new Set(seen).size;
  }, duration);

const clickNextButton = async (page) => {
  const box = await page.locator('#c1').boundingBox();
  await page.mouse.click(box.x + box.width - 24, box.y + box.height / 2);
};

test.describe('스크롤 애니메이션', () => {
  // 네이티브 ::scroll-button()과 ::scroll-marker 클릭은 스크롤러의 CSS
  // scroll-behavior를 따른다. 폴백 경로는 JS가 behavior를 명시하므로,
  // 이 선언이 없으면 Chromium만 즉시 점프해 두 경로가 어긋난다.
  test('네이티브 스크롤 버튼이 부드럽게 이동한다', async ({ page }) => {
    await page.goto('/test/fixtures/no-js.html');
    test.skip(!(await nativeOnly(page)), 'native scroll button 미지원 브라우저');

    const sampling = distinctScrollSteps(page, 900);
    await clickNextButton(page);

    // scroll-behavior: auto면 한 프레임에 목적지로 점프해 2개만 관측된다
    expect(await sampling).toBeGreaterThan(4);
  });

  test.describe('모션 축소', () => {
    test.use({ reducedMotion: 'reduce' });

    test('reduced motion에서는 즉시 이동한다', async ({ page }) => {
      await page.goto('/test/fixtures/no-js.html');
      test.skip(!(await nativeOnly(page)), 'native scroll button 미지원 브라우저');

      const sampling = distinctScrollSteps(page, 900);
      await clickNextButton(page);

      expect(await sampling).toBeLessThanOrEqual(2);
    });
  });
});
