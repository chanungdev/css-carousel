import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/basic.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
});

test('auto-init이 인스턴스를 붙인다', async ({ page }) => {
  const ok = await page.evaluate(() => document.querySelector('#c1').carousel instanceof window.Carousel);
  expect(ok).toBe(true);
});

test('초기 인덱스는 0이다', async ({ page }) => {
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(0);
});

test('goTo가 해당 아이템을 스크롤포트 시작에 맞춘다', async ({ page }) => {
  await page.evaluate(() => document.querySelector('#c1').carousel.goTo(3, 'instant'));

  const delta = () => {
    const c = document.querySelector('#c1').carousel;
    const s = c.scroller.getBoundingClientRect();
    const i = c.items[3].getBoundingClientRect();
    return i.left - s.left;
  };
  await page.waitForFunction(`Math.abs((${delta.toString()})()) < 2`);

  expect(Math.abs(await page.evaluate(delta))).toBeLessThan(2);
});

test('next / prev가 한 칸씩 이동한다', async ({ page }) => {
  await page.evaluate(() => document.querySelector('#c1').carousel.next('instant'));
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 1);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(1);

  await page.evaluate(() => document.querySelector('#c1').carousel.prev('instant'));
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 0);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(0);
});

test('인덱스 변경 시 carousel:change가 발생한다', async ({ page }) => {
  const detail = await page.evaluate(async () => {
    const root = document.querySelector('#c1');
    const received = new Promise((resolve) =>
      root.addEventListener('carousel:change', (e) => resolve(e.detail), { once: true }),
    );
    root.carousel.goTo(2, 'instant');
    return received;
  });
  expect(detail).toEqual({ index: 2, slideIndex: 2 });
});

test('스크롤 끝에서는 정렬 앵커가 닿지 못해도 마지막 아이템이 index가 된다', async ({ page }) => {
  // 공유 fixture는 --carousel-items:3, 아이템 6개라 align:start로 도달 가능한
  // 앵커 최대치는 index 3. 네이티브 ::scroll-marker는 스크롤 끝에서 마지막
  // 아이템을 current로 잡으므로 폴백도 맞춰야 한다.
  await page.evaluate(() => {
    const s = document.querySelector('#c1 [data-carousel-scroller]');
    s.scrollTo({ left: s.scrollWidth, behavior: 'instant' });
  });
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 5);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(5);
});

test('destroy가 인스턴스를 제거한다', async ({ page }) => {
  const gone = await page.evaluate(() => {
    const root = document.querySelector('#c1');
    root.carousel.destroy();
    return root.carousel === undefined;
  });
  expect(gone).toBe(true);
});
