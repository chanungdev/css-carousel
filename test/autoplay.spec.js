import { test, expect } from '@playwright/test';

const ready = async (page) => {
  await page.goto('/test/fixtures/autoplay.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
};

const index = (page) => page.evaluate(() => document.querySelector('#c1').carousel.index);
const isNative = (page) => page.evaluate(() => CSS.supports('selector(::scroll-marker)'));

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
  // hover()가 resolve됐다고 해서 pointerenter 핸들러가 이미 반영됐다는
  // 보장은 없다 — 부하가 크면 hover 처리와 300ms 틱이 경합해 스냅샷을
  // hover 반영 전에 찍을 수 있다. 그러면 "언제 hover가 반영되는지"에
  // 테스트 결과가 좌우되는, 검증 대상과 무관한 이유로 실패하게 된다.
  // 그래서 hover 직후 값과 비교하는 대신, 유예를 한 번 흡수한 뒤의 값을
  // 기준으로 삼아 "hover가 걸린 동안은 안정적으로 멈춰 있는지"만 본다.
  await page.waitForTimeout(500);
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
  // 부재를 검증하는 테스트: 고정 대기가 맞다. 900ms(=3틱, 한 바퀴)는 피한다 —
  // 이 테스트는 정확히 "타이머가 아예 안 만들어지는지"를 검증하는데, 만약
  // prefersReducedMotion() 가드가 깨져 타이머가 생겨도 900ms 뒤엔 한 바퀴 돌아
  // 우연히 같은 인덱스(0)로 돌아와 버그를 숨긴다. 다른 테스트와 같은 이유로
  // 500ms를 쓴다.
  await page.waitForTimeout(500);
  expect(await index(page)).toBe(0);
});

test('사용자가 스크롤하면 영구히 멈춘다', async ({ page }) => {
  await ready(page);
  await page.locator('#c1 [data-carousel-scroller]').hover();
  await page.mouse.wheel(200, 0);
  // wheel 처리(stop() 호출)가 실제로 반영될 유예를 흡수한다 — 이 대기가
  // 없으면 "언제 stop()이 반영됐는지"에 좌우되는 스냅샷이 된다(위 hover
  // 테스트와 같은 이유).
  await page.waitForTimeout(500);
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
  // wheel 처리(stop() 호출)가 실제로 반영될 유예를 흡수한다(위 테스트와
  // 같은 이유).
  await page.waitForTimeout(500);
  // hover 자체가 아니라 wheel이 "영구히" 멈췄는지 검증하려면 hover를 풀어야
  // 한다(위 테스트와 같은 이유).
  await page.mouse.move(0, 2000);
  const after = await index(page);
  // 부재를 검증하는 테스트: 고정 대기로 확정한다. 900ms(=한 바퀴)는 피한다 —
  // 위 테스트와 같은 이유로 우연히 같은 인덱스로 돌아올 수 있다.
  await page.waitForTimeout(500);
  expect(await index(page)).toBe(after);
});

// 회귀 테스트: 폴백의 버튼·마커는 scroller의 자식이 아니라 형제(root의
// 자식)다. 정지 리스너가 scroller에만 걸려 있으면 그 클릭이 닿지 않아
// Chromium(네이티브)에서만 우연히 통과하고 폴백 브라우저에서는 계속
// 자동재생됐다.
test('폴백 화살표 버튼 클릭도 영구히 자동재생을 멈춘다', async ({ page }) => {
  await ready(page);
  test.skip(await isNative(page), '네이티브 지원 브라우저');

  await page.locator('#c1 .carousel-button-next').click();
  // 버튼 위에 포인터가 남아있으면 hover-pause와 섞여 "영구히" 멈췄는지
  // wheel/pointerdown 정지 효과와 구분되지 않는다 — 포인터를 치운다.
  await page.mouse.move(0, 2000);
  // 클릭은 버튼에 포커스도 남긴다(Safari/WebKit 제외). focusin으로 인한
  // 일시 정지와 stop()의 영구 정지를 구분해야 pointerdown 리스너가 실제로
  // 동작했는지 검증한 것이 된다 — 포커스도 치운다.
  await page.evaluate(() => document.activeElement?.blur());
  // 클릭이 만든 smooth 스크롤과, 정지가 실패했을 때의 자동 전진 한 틱이
  // 끝날 유예를 흡수한 값을 기준선으로 삼는다(위 hover 테스트와 같은 이유 —
  // "언제 정착했는지"에 좌우되지 않게 한다).
  await page.waitForTimeout(500);
  const after = await index(page);
  // 부재를 검증하는 테스트: 한 바퀴(900ms)와 겹치지 않는 500ms 고정 대기로
  // 다시 확정한다. 아이템 3개·간격 300ms라 500ms 안에는 반드시 1틱은
  // 일어나므로, 안 멈췄다면 이 값은 반드시 바뀐다.
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
  // hover 처리 유예를 흡수해 hovered=true가 확정된 뒤에 콜백을 흘려보낸다
  // (위 hover 테스트와 같은 이유 — hover() resolve와 실제 반영 사이의
  // 경합이 이 회귀 시나리오 자체와 뒤섞이지 않도록 분리한다).
  await page.waitForTimeout(500);

  // hover보다 늦게 도착하는 visibility 콜백을 흉내낸다 (부하 상황 재현).
  await page.evaluate(() => {
    const cb = window.__autoplayIoCallbacks.at(-1);
    cb([{ isIntersecting: true, target: document.querySelector('#c1') }]);
  });
  const before = await index(page);

  // 부재를 검증하는 테스트: 고정 대기로 확정한다. 900ms는 피한다 — 위와 같은
  // 이유로 멈추지 않았어도 한 바퀴 돌아 우연히 같은 값이 될 수 있다.
  await page.waitForTimeout(500);
  expect(await index(page)).toBe(before);
});

test.describe('data-carousel-autoplay-resume', () => {
  const readyResume = async (page) => {
    await page.goto('/test/fixtures/autoplay-resume.html');
    await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
  };

  // 사용자 입력 후 마우스를 치우고 포커스를 푸는 이유는 위 영구 정지 테스트와
  // 같다 — hover-pause나 focus-pause가 남아 있으면 "재시작하지 않는 것"이
  // resume 로직 때문인지 다른 정지 사유 때문인지 구분되지 않는다.
  // wheel로 인터럽트하면 폴백 경로에서 실제 스크롤이 일어나고, 스냅이 되돌아오는
  // 동안 인덱스가 계속 바뀐다. 그러면 "멈춰 있다"가 깨진 이유가 autoplay인지
  // 사용자 스크롤인지 구분되지 않는다. pointerdown은 같은 interrupt() 경로를
  // 타면서 스크롤을 일으키지 않아 그 잡음이 없다. wheel 경로는 위의 영구 정지
  // 테스트들이 덮는다.
  const interruptAndRelease = async (page) => {
    const box = await page.locator('#c1').boundingBox();
    // 가장자리에는 폴백 버튼이 있어 누르면 goTo가 불린다 — 가운데를 누른다.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.mouse.move(0, 2000);
    await page.evaluate(() => document.activeElement?.blur?.());
  };

  test('사용자 입력 후 지정한 시간이 지나면 다시 돈다', async ({ page }) => {
    await readyResume(page);
    await interruptAndRelease(page);

    const paused = await index(page);
    // 재시작을 검증하는 테스트이므로 조건 대기를 쓴다. resume 지연(700ms)보다
    // 넉넉한 타임아웃을 주되, 통과 조건은 "인덱스가 실제로 바뀐다"뿐이다.
    await page.waitForFunction(
      (before) => document.querySelector('#c1').carousel.index !== before,
      paused,
      { timeout: 4000 },
    );
  });

  test('재시작 전까지는 멈춰 있다', async ({ page }) => {
    await readyResume(page);
    await interruptAndRelease(page);

    const paused = await index(page);
    // 부재를 검증하는 구간. resume 지연 700ms보다 짧고, 틱 주기 300ms의
    // 배수가 아닌 값을 써서 "안 멈췄는데 우연히 같은 인덱스"를 배제한다.
    await page.waitForTimeout(500);
    expect(await index(page)).toBe(paused);
  });

  test('입력이 이어지면 재시작 카운트다운이 다시 시작된다', async ({ page }) => {
    await readyResume(page);
    await interruptAndRelease(page);
    const paused = await index(page);

    // 첫 입력으로부터 700ms가 지나기 전에 다시 입력하면 카운트다운이 리셋되어
    // 그 시점부터 다시 700ms를 기다려야 한다.
    await page.waitForTimeout(800);
    await interruptAndRelease(page);

    // 리셋이 없다면 첫 입력의 타이머가 1500ms에 풀린다. 단언 시점이 그보다
    // 최소 한 틱(300ms) 뒤여야 "풀렸는데 아직 안 움직인" 상태와 구분된다.
    await page.waitForTimeout(1300);
    expect(await index(page)).toBe(paused);
  });

  test('속성이 없으면 기존대로 영구히 멈춘다', async ({ page }) => {
    await ready(page);
    await page.locator('#c1 [data-carousel-scroller]').hover();
    await page.mouse.wheel(200, 0);
    await page.waitForTimeout(500);
    await page.mouse.move(0, 2000);
    const after = await index(page);
    // resume 지연으로 쓰는 700ms보다 충분히 긴 시간을 기다려도 재시작하지
    // 않아야 한다 — 재시작 기능이 기본값을 바꾸지 않았음을 고정한다.
    await page.waitForTimeout(1500);
    expect(await index(page)).toBe(after);
  });
});
