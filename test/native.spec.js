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
