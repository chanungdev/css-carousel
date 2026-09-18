import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/test/fixtures/dynamic.html');
  await page.waitForFunction(() => typeof window.addCarousel === 'function');
});

test('나중에 추가된 carousel이 자동 초기화된다', async ({ page }) => {
  await page.evaluate(() => window.addCarousel('late'));
  await page.waitForFunction(() => !!document.querySelector('#late')?.carousel, null, { timeout: 2000 });
  expect(await page.evaluate(() => document.querySelector('#late').carousel.items.length)).toBe(6);
});

test('제거된 carousel은 정리된다', async ({ page }) => {
  await page.evaluate(() => window.addCarousel('temp'));
  await page.waitForFunction(() => !!document.querySelector('#temp')?.carousel);

  await page.evaluate(() => {
    const root = document.querySelector('#temp');
    window.__destroyed = false;
    root.carousel.onDestroy(() => {
      window.__destroyed = true;
    });
    root.remove();
  });

  await page.waitForFunction(() => window.__destroyed === true);
  expect(await page.evaluate(() => window.__destroyed)).toBe(true);
});

test('같은 요소를 두 번 초기화하지 않는다', async ({ page }) => {
  await page.evaluate(() => window.addCarousel('once'));
  await page.waitForFunction(() => !!document.querySelector('#once')?.carousel);

  const same = await page.evaluate(() => {
    const root = document.querySelector('#once');
    const first = root.carousel;
    window.Carousel.init(root);
    return root.carousel === first;
  });
  expect(same).toBe(true);
});

test('무관한 DOM 변경이 계속 발생해도 carousel 초기화가 밀리지 않는다', async ({ page }) => {
  await page.evaluate(() => {
    const churn = document.createElement('div');
    churn.id = 'churn';
    document.body.append(churn);
    window.__churning = true;
    (function tick() {
      if (!window.__churning) return;
      const span = document.createElement('span');
      churn.append(span);
      span.remove();
      setTimeout(tick, 10);
    })();
  });

  try {
    await page.evaluate(() => window.addCarousel('starved'));
    await page.waitForFunction(() => !!document.querySelector('#starved')?.carousel, null, {
      timeout: 2000,
    });
    expect(
      await page.evaluate(() => document.querySelector('#starved').carousel.items.length),
    ).toBe(6);
  } finally {
    await page.evaluate(() => {
      window.__churning = false;
    });
  }
});

test('같은 배치 안에서 추가 후 제거된 요소는 초기화되지 않는다', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));

  await page.evaluate(() => {
    window.addCarousel('inout');
    window.__inout = document.querySelector('#inout');
    window.__inout.remove();
  });

  // flush가 실행될 시간(BATCH_MS=50ms)보다 넉넉히 기다린 뒤 아무 일도 없었는지 확인한다.
  // 상태 변화를 기다리는 게 아니라 "아무것도 안 일어남"을 확인하는 것이므로 고정 대기가 정당하다.
  await page.waitForTimeout(200);

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => !!window.__inout.carousel)).toBe(false);
});
