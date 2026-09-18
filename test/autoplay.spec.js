import { test, expect } from '@playwright/test';

const ready = async (page) => {
  await page.goto('/test/fixtures/autoplay.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
};

const index = (page) => page.evaluate(() => document.querySelector('#c1').carousel.index);

test('일정 간격으로 다음 아이템으로 넘어간다', async ({ page }) => {
  await ready(page);
  expect(await index(page)).toBe(0);
  // 전진을 검증하는 테스트이므로 고정 대기 대신 상태 변화를 조건 대기한다.
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index > 0, null, { timeout: 3000 });
  expect(await index(page)).toBeGreaterThan(0);
});

test('마지막 아이템 다음에는 처음으로 돌아간다', async ({ page }) => {
  await ready(page);
  // 마지막 인덱스(2)를 지난 뒤 0이 다시 나타나야 순환한 것이다
  await page.waitForFunction(
    () => {
      const seen = window.__seen ?? [];
      const lastItem = seen.indexOf(2);
      return lastItem >= 0 && seen.slice(lastItem + 1).includes(0);
    },
    null,
    { timeout: 5000 },
  );
});

test('hover 중에는 멈춘다', async ({ page }) => {
  await ready(page);
  await page.locator('#c1').hover();
  const before = await index(page);
  // "아무 일도 일어나지 않는다"를 검증하는 테스트라 고정 대기가 맞다. 단,
  // 아이템이 3개·간격이 300ms라 900ms(=3틱)를 기다리면 멈추지 않았어도
  // 정확히 한 바퀴 돌아 같은 인덱스로 되돌아와 통과해버리는 우연이 생긴다.
  // 최소 한 틱(300ms)은 지나가되 한 바퀴(900ms)와는 겹치지 않는 500ms를 쓴다.
  await page.waitForTimeout(500);
  expect(await index(page)).toBe(before);
});

test('reduced motion이면 시작하지 않는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  // 위와 동일하게 부재(아무 일도 없음)를 검증하므로 고정 대기가 맞다.
  await page.waitForTimeout(900);
  expect(await index(page)).toBe(0);
});

test('사용자가 스크롤하면 영구히 멈춘다', async ({ page }) => {
  await ready(page);
  await page.locator('#c1 [data-carousel-scroller]').hover();
  await page.mouse.wheel(200, 0);
  await page.waitForTimeout(200);
  // hover 자체가 아니라 wheel이 "영구히" 멈췄는지 검증하려면 hover를 풀어야
  // 한다. 마우스가 캐러셀 위에 계속 남아 있으면 hover-pause만으로도 멈춘
  // 것처럼 보여서 wheel의 정지 효과와 구분되지 않는다.
  await page.mouse.move(0, 2000);
  const after = await index(page);
  // 부재를 검증하는 테스트: 스크롤 직후 상태를 고정 시간만큼 기다려 확정한 뒤,
  // 그 이후로도 더 이상 바뀌지 않아야 한다. 아이템 3개·간격 300ms에서는
  // 900ms(=3틱, 한 바퀴)를 쓰면 멈추지 않았어도 같은 인덱스로 우연히 돌아올
  // 수 있으므로, 한 바퀴와는 겹치지 않는 500ms를 쓴다.
  await page.waitForTimeout(500);
  expect(await index(page)).toBe(after);
});

// 회귀 테스트: 예전에는 advance()가 만든 스크롤 후 700ms 동안 "programmatic"
// 플래그가 wheel/pointerdown을 무시했다. scrollTo()는 wheel도 pointerdown도
// 스스로 발생시키지 않으므로 그 창은 실제 사용자 입력만 삼키는 결함이었다.
test('회귀: 자동 전진 직후의 사용자 wheel도 영구히 멈춘다', async ({ page }) => {
  await ready(page);
  // 첫 전진(t≈300ms) 직후 = 예전 코드에서 programmatic이 true였던 700ms 창의 시작
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index > 0, null, { timeout: 3000 });
  await page.locator('#c1 [data-carousel-scroller]').hover();
  await page.mouse.wheel(200, 0);
  await page.waitForTimeout(200);
  // hover 자체가 아니라 wheel이 "영구히" 멈췄는지 검증하려면 hover를 풀어야
  // 한다(위 테스트와 같은 이유).
  await page.mouse.move(0, 2000);
  const after = await index(page);
  // 부재를 검증하는 테스트: 고정 대기로 확정한다. 900ms(=한 바퀴)는 피한다 —
  // 위 테스트와 같은 이유로 우연히 같은 인덱스로 돌아올 수 있다.
  await page.waitForTimeout(500);
  expect(await index(page)).toBe(after);
});

// 회귀 테스트: 예전에는 hover(paused=true)와 IntersectionObserver 콜백
// (paused = !isIntersecting)이 같은 boolean을 나중에 쓴 쪽이 이기는 방식으로
// 공유했다. hover 이후에 "화면에 보인다"는 콜백이 뒤늦게 도착하면 hover
// 정지가 지워졌다 — 부하가 큰 환경에서 실제로 관찰된 1/9 webkit 플레이크의
// 원인이다.
test('회귀: hover 이후 visibility 콜백이 뒤늦게 와도 정지 사유가 지워지지 않는다', async ({ page }) => {
  await page.addInitScript(() => {
    window.__autoplayIoCallbacks = [];
    const Native = window.IntersectionObserver;
    window.IntersectionObserver = class extends Native {
      constructor(cb, opts) {
        // autoplay의 IO(threshold: 0)만 가로챈다: 실제 콜백은 절대 부르지
        // 않고 테스트가 원하는 시점에 수동으로만 호출한다. Carousel 자체의
        // 내부 IO(threshold: THRESHOLDS 배열)는 그대로 둬서 index 갱신이
        // 실제 레이아웃을 따라가게 한다 — 그래야 "안 바뀐다"는 검증이
        // 무의미해지지 않는다.
        if (opts?.threshold === 0) {
          super(() => {}, opts);
          window.__autoplayIoCallbacks.push(cb);
        } else {
          super(cb, opts);
        }
      }
    };
  });
  await ready(page);
  await page.locator('#c1').hover();
  const before = await index(page);

  // hover보다 늦게 도착하는 visibility 콜백을 흉내낸다 (부하 상황 재현).
  await page.evaluate(() => {
    const cb = window.__autoplayIoCallbacks.at(-1);
    cb([{ isIntersecting: true, target: document.querySelector('#c1') }]);
  });

  // 부재를 검증하는 테스트: 고정 대기로 확정한다. 900ms는 피한다 — 위와 같은
  // 이유로 멈추지 않았어도 한 바퀴 돌아 우연히 같은 값이 될 수 있다.
  await page.waitForTimeout(500);
  expect(await index(page)).toBe(before);
});
