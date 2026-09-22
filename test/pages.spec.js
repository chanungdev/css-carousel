import { test, expect } from '@playwright/test';

// 페이지 모드는 슬라이드를 한 장씩이 아니라 한 화면씩 넘긴다. 목록은 평평한 채로
// 두고 브라우저가 multicol로 나눈다 — 작성자가 손으로 끊지 않는다.

const supportsColumn = (page) => page.evaluate(() => CSS.supports('selector(::column)'));

const ready = async (page) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await page.goto('/test/fixtures/pages.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
};

const index = (page) => page.evaluate(() => document.querySelector('#c1').carousel.index);

test('아이템이 페이지 안에서 줄을 이뤄 배치된다', async ({ page }) => {
  await ready(page);

  const pos = await page.evaluate(() =>
    [...document.querySelectorAll('[data-carousel-scroller] > li')].slice(0, 6).map((el) => {
      const r = el.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y)];
    }),
  );

  // --carousel-items: 3 이므로 한 줄에 셋, 높이가 두 줄을 허용하므로 3×2
  expect(pos[0][1]).toBe(pos[1][1]);
  expect(pos[1][1]).toBe(pos[2][1]);
  expect(pos[3][1]).toBeGreaterThan(pos[0][1]);
  expect(pos[0][0]).toBe(pos[3][0]);

  // 12장이 6장씩 두 페이지
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.pageCount)).toBe(2);
});

test('next·prev가 슬라이드가 아니라 페이지를 넘긴다', async ({ page }) => {
  await ready(page);

  const viewport = await page.evaluate(
    () => document.querySelector('[data-carousel-scroller]').clientWidth,
  );

  await page.evaluate(() => document.querySelector('#c1').carousel.next('instant'));
  await expect.poll(() => index(page)).toBe(1);

  // 한 페이지만큼 움직였는지 — 슬라이드 하나 폭이면 훨씬 작다
  const moved = await page.evaluate(() =>
    Math.round(document.querySelector('[data-carousel-scroller]').scrollLeft),
  );
  expect(moved).toBeGreaterThanOrEqual(viewport);

  // 마지막 페이지에서 더 가지 않는다
  await page.evaluate(() => document.querySelector('#c1').carousel.next('instant'));
  await expect.poll(() => index(page)).toBe(1);

  await page.evaluate(() => document.querySelector('#c1').carousel.prev('instant'));
  await expect.poll(() => index(page)).toBe(0);
});

// 스냅 대상은 페이지 하나뿐이어야 한다. 슬라이드에도 정렬이 남아 있으면 스크롤이
// 카드 경계에 멈춰, 앞 페이지 끝과 다음 페이지 앞이 한 화면에 섞인다.
// ::column이 없는 브라우저에는 스냅 대상 자체가 없으므로 스크립트가 대신 맞춘다.
test('페이지 경계에만 멈춘다', async ({ page }) => {
  await ready(page);

  const stride = await page.evaluate(() => {
    const scroller = document.querySelector('[data-carousel-scroller]');
    return scroller.clientWidth + (Number.parseFloat(getComputedStyle(scroller).columnGap) || 0);
  });
  const position = () =>
    page.evaluate(() => Math.round(document.querySelector('[data-carousel-scroller]').scrollLeft));

  const driftTo = (fraction) =>
    page.evaluate(
      (offset) => {
        document
          .querySelector('[data-carousel-scroller]')
          .scrollTo({ left: offset, behavior: 'smooth' });
      },
      Math.round(stride * fraction),
    );

  // 페이지의 30% 지점은 앞 페이지로 되돌아온다
  await driftTo(0.3);
  await expect.poll(position, { timeout: 4000 }).toBe(0);

  // 60% 지점은 다음 페이지로 넘어간다
  await driftTo(0.6);
  await expect.poll(position, { timeout: 4000 }).toBe(stride);
});

test.describe('폴백 경로', () => {
  test.beforeEach(async ({ page }) => {
    await ready(page);
    test.skip(await supportsColumn(page), '::column을 지원하는 브라우저');
  });

  test('마커가 슬라이드가 아니라 페이지마다 하나씩 생긴다', async ({ page }) => {
    // 슬라이드는 12장이지만 페이지는 2개다
    await expect(page.locator('.carousel-marker')).toHaveCount(2);
  });

  test('마커를 누르면 그 페이지로 간다', async ({ page }) => {
    await page.locator('.carousel-marker').nth(1).click();
    await expect.poll(() => index(page)).toBe(1);

    await page.locator('.carousel-marker').nth(0).click();
    await expect.poll(() => index(page)).toBe(0);
  });

  // 페이지 수는 브라우저가 정한다. 줄 수가 바뀌면 다시 나뉘므로 마커도 따라야 한다.
  test('페이지가 다시 나뉘면 마커도 다시 만들어진다', async ({ page }) => {
    await page.evaluate(() =>
      document.querySelector('#c1').style.setProperty('--carousel-page-block', '160px'),
    );

    // 두 줄이 한 줄이 되면 페이지당 3장 — 12장이면 네 페이지다
    await expect
      .poll(() => page.evaluate(() => document.querySelector('#c1').carousel.pageCount))
      .toBe(4);
    await expect(page.locator('.carousel-marker')).toHaveCount(4);
  });
});

test.describe('네이티브 경로', () => {
  test.beforeEach(async ({ page }) => {
    await ready(page);
    test.skip(!(await supportsColumn(page)), '::column 미지원 브라우저');
  });

  // 마커가 페이지를 가리켜야 하므로 슬라이드 쪽 마커는 꺼야 한다.
  // 안 끄면 12개와 2개가 함께 나온다.
  test('슬라이드 마커는 꺼진다', async ({ page }) => {
    const content = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector('[data-carousel-scroller]').firstElementChild,
          '::scroll-marker',
        ).content,
    );
    expect(content).not.toBe('""');
  });

  // 브라우저가 만든 마커는 computed style로 셀 수 없다 — ::column::scroll-marker는
  // 중첩 pseudo라 getComputedStyle이 값을 돌려주지 않고, ::scroll-marker-group의
  // 크기도 0으로 나온다. 대신 접근성 트리에 tab으로 노출되는 것을 센다.
  test('컬럼마다 마커가 하나씩 생긴다', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const tabs = nodes.filter((node) => node.role?.value === 'tab').length;

    // 슬라이드는 12장이지만 페이지는 2개다
    expect(tabs).toBe(2);
  });
});

// counter는 슬라이드가 올린다. 페이지 모드에서 세어야 할 것은 페이지라
// "1 / 12" 같은 틀린 값이 나오므로 아예 내지 않는다.
test('페이지 모드에서는 카운터를 내지 않는다', async ({ page }) => {
  await ready(page);

  const content = await page.evaluate(
    () => getComputedStyle(document.querySelector('[data-carousel-scroller]'), '::after').content,
  );
  expect(content).toBe('none');
});
