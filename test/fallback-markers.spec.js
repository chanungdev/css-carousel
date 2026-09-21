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

// 스크롤이 멎을 때까지 기다린 뒤에 판정한다. 스무스 스크롤 도중에는 목표를
// 스쳐 지나가므로, 중간 상태를 잡으면 부하에 따라 결과가 갈린다.
const scrollIdle = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.querySelector('#c1 [data-carousel-scroller]');
        let last = el.scrollLeft;
        let quiet = 0;
        const tick = () => {
          if (el.scrollLeft !== last) {
            last = el.scrollLeft;
            quiet = 0;
          } else {
            quiet += 1;
          }
          if (quiet >= 20) return resolve();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

test('마커 클릭이 해당 아이템으로 이동시킨다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');

  // 픽스처는 한 화면 3개·전체 6개라 도달 가능한 최대 정렬 인덱스는 3이고,
  // 그 위치는 스크롤 최대치와 같아 끝 규칙에 따라 마지막 아이템으로 해석된다.
  // 그래서 중간에 있는 마커로 확인한다.
  await page.locator('#c1 .carousel-marker').nth(1).click();
  await scrollIdle(page);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(1);
});

// 끝 규칙 자체도 고정해둔다: 마지막 마커를 누르면 스크롤 끝에 닿고,
// 그때는 마지막 아이템이 현재가 된다(네이티브 ::scroll-marker와 같은 동작).
test('마지막 마커를 누르면 스크롤 끝에서 마지막 아이템이 현재가 된다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');

  const last = await page.evaluate(() => document.querySelector('#c1').carousel.items.length - 1);
  await page.locator('#c1 .carousel-marker').nth(last).click();
  await scrollIdle(page);

  const state = await page.evaluate(() => {
    const c = document.querySelector('#c1').carousel;
    const s = c.scroller;
    return { index: c.index, atEnd: Math.abs(s.scrollLeft - (s.scrollWidth - s.clientWidth)) <= 1 };
  });
  expect(state.atEnd).toBe(true);
  expect(state.index).toBe(last);
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

test('스크롤 끝에서는 마지막 마커가 aria-selected=true다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await page.evaluate(() => {
    const s = document.querySelector('#c1 [data-carousel-scroller]');
    s.scrollTo({ left: s.scrollWidth, behavior: 'instant' });
  });
  await expect(page.locator('#c1 .carousel-marker').last()).toHaveAttribute('aria-selected', 'true');
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

test('마커 그룹에 포커스가 있을 때 화살표 이동이 새 현재 마커로 포커스를 옮긴다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  await page.locator('#c1 .carousel-marker').first().focus();

  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 1);

  const focused = await page.evaluate(() => {
    const marker = document.querySelectorAll('#c1 .carousel-marker')[1];
    return document.activeElement === marker;
  });
  expect(focused).toBe(true);
});

test('마커 그룹 밖에 포커스가 있으면 인덱스가 바뀌어도 포커스가 그대로 있다', async ({ page }) => {
  test.skip(await isNative(page), '네이티브 지원 브라우저');
  // prev 버튼은 index 0에서 disabled라 focus를 받을 수 없으므로 next를 쓴다
  await page.locator('#c1 .carousel-button-next').focus();

  await page.evaluate(() => document.querySelector('#c1').carousel.goTo(2, 'instant'));
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 2);

  const stillOnNextButton = await page.evaluate(
    () => document.activeElement === document.querySelector('#c1 .carousel-button-next'),
  );
  expect(stillOnNextButton).toBe(true);
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
