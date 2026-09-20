import { test, expect } from '@playwright/test';

const isNative = (page) => page.evaluate(() => CSS.supports('selector(::scroll-marker)'));

const ready = async (page) => {
  await page.goto('/test/fixtures/theme-basic.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
};

const boxes = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('#c1');
    const scroller = root.querySelector('[data-carousel-scroller]');
    const rr = root.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    const button = root.querySelector('.carousel-button-prev');
    const br = button?.getBoundingClientRect() ?? null;
    return {
      wrapperHeight: Math.round(rr.height),
      scrollerHeight: Math.round(sr.height),
      scrollerCenter: sr.top + sr.height / 2,
      buttonCenter: br ? br.top + br.height / 2 : null,
    };
  });

// 마커가 흐름에 남아 있으면 wrapper가 스크롤러보다 높아지고, wrapper 기준 50%로
// 놓이는 좌/우 버튼이 그만큼 카드 중심 아래로 내려간다. 테마는 마커를 오버레이로
// 빼서 두 높이를 같게 만든다 — 그게 버튼 정렬의 전제다.
test('마커가 흐름에서 빠져 wrapper 높이가 스크롤러와 같다', async ({ page }) => {
  await ready(page);
  const { wrapperHeight, scrollerHeight } = await boxes(page);
  expect(wrapperHeight).toBe(scrollerHeight);
});

test('폴백 버튼이 카드 세로 중앙에 온다', async ({ page }) => {
  await ready(page);
  test.skip(await isNative(page), '폴백 버튼이 있는 브라우저 전용');

  const { buttonCenter, scrollerCenter } = await boxes(page);
  expect(Math.abs(buttonCenter - scrollerCenter)).toBeLessThan(1);
});

// 네이티브 경로에서도 마커 그룹이 흐름에서 빠져야 같은 정렬이 성립한다.
// pseudo-element는 셀렉터로 못 잡으니 wrapper 높이로 간접 확인한다.
test('네이티브 마커 그룹도 흐름에서 빠진다', async ({ page }) => {
  await ready(page);
  test.skip(!(await isNative(page)), '네이티브 마커가 있는 브라우저 전용');

  const { wrapperHeight, scrollerHeight } = await boxes(page);
  expect(wrapperHeight).toBe(scrollerHeight);
});

test('마커 색이 어두운 배경에서도 보이는 값이다', async ({ page }) => {
  await ready(page);
  const color = await page
    .locator('#c1')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--carousel-marker-color').trim());
  // 기본값은 rgb(0 0 0 / 0.25)라 어두운 배경에서 사라진다. 테마는 밝은 값을 쓴다.
  expect(color).not.toContain('0, 0, 0');
  expect(color).toMatch(/255/);
});
