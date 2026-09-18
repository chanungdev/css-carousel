import { test, expect } from '@playwright/test';

const ready = async (page, url) => {
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#c1')?.carousel?.setSize != null);
};

const isNative = (page) => page.evaluate(() => CSS.supports('selector(::scroll-marker)'));

/**
 * 세 번째 세트로 점프한 뒤 recenter를 기다린다.
 * scrollToSlide(6, 'instant')는 동기적으로 scrollLeft를 옮기므로, 그 직후의
 * scrollLeft는 확정적으로 가운데 세트 밖의 값이다. 이 값을 먼저 기록해두지
 * 않고 곧장 slideIndex === 3을 기다리면, 점프 전부터 이미 3이었던(아직
 * IntersectionObserver가 갱신하지 않은) 값과 recenter가 만든 진짜 3을 구분할
 * 수 없는 경합이 생긴다. scrollLeft가 그 값을 벗어난 뒤에야 slideIndex === 3을
 * 확인해야 진짜 왕복을 검증한 것이 된다.
 */
const jumpToThirdSetAndWaitForRecenter = async (page) => {
  // scrollToSlide 호출과 scrollLeft 읽기를 같은 evaluate 안에서(동기적으로)
  // 수행해야 한다. 두 번의 evaluate로 나누면 그 사이에 scrollend/idle 타이머가
  // 끼어들어 recenter가 이미 끝난 뒤의 값을 "점프 직후 값"으로 잘못 기록할 수
  // 있다(recenter가 매우 빠르게 실행되는 엔진에서 관찰됨).
  const jumped = await page.evaluate(() => {
    const c = document.querySelector('#c1').carousel;
    c.scrollToSlide(6, 'instant'); // 세 번째 세트 진입
    return c.scroller.scrollLeft;
  });
  await page.waitForFunction((from) => document.querySelector('#c1').carousel.scroller.scrollLeft !== from, jumped);
  await page.waitForFunction(() => document.querySelector('#c1').carousel.slideIndex === 3);
};

test('자동 모드가 3세트를 만든다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop.html');
  const state = await page.evaluate(() => {
    const c = document.querySelector('#c1').carousel;
    return { slides: c.slides.length, items: c.items.length, setSize: c.setSize };
  });
  expect(state).toEqual({ slides: 9, items: 3, setSize: 3 });
});

test('복제본은 aria-hidden 처리된다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop.html');
  const clones = await page.locator('#c1 [data-carousel-clone]').count();
  expect(clones).toBe(6);
  await expect(page.locator('#c1 [data-carousel-clone]').first()).toHaveAttribute('aria-hidden', 'true');
});

test('가운데 세트에서 시작한다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop.html');
  // slideIndex는 IntersectionObserver가 비동기로 갱신한다. setSize가 설정된
  // 시점에는 아직 반영 전일 수 있으므로 값이 안정될 때까지 기다린다.
  await page.waitForFunction(() => document.querySelector('#c1').carousel.slideIndex === 3);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.slideIndex)).toBe(3);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(0);
});

test('수동 모드는 복제하지 않고 setSize만 계산한다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop-manual.html');
  const state = await page.evaluate(() => {
    const c = document.querySelector('#c1').carousel;
    return { slides: c.slides.length, setSize: c.setSize, clones: c.root.querySelectorAll('[data-carousel-clone]').length };
  });
  expect(state).toEqual({ slides: 9, setSize: 3, clones: 0 });
});

test('마지막 아이템에서 next를 하면 첫 아이템으로 이어진다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop.html');

  // 가운데 세트의 마지막(slideIndex 5)까지 이동
  await page.evaluate(() => document.querySelector('#c1').carousel.scrollToSlide(5, 'instant'));
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 2);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(2);

  // 한 칸 더 → 세 번째 세트의 첫 아이템(slideIndex 6) → 논리 인덱스 0
  await page.evaluate(() => document.querySelector('#c1').carousel.next('instant'));
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 0);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(0);
});

test('경계를 넘으면 가운데 세트로 되돌아온다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop.html');
  await page.waitForFunction(() => document.querySelector('#c1').carousel.slideIndex === 3);

  // scrollend 또는 idle 타이머가 세 번째 세트 진입을 감지해 가운데 세트로 되돌린다
  await jumpToThirdSetAndWaitForRecenter(page);

  const state = await page.evaluate(() => {
    const c = document.querySelector('#c1').carousel;
    return { slideIndex: c.slideIndex, index: c.index };
  });
  expect(state.slideIndex).toBe(3);
  expect(state.index).toBe(0);
});

test('scrollend 미지원 브라우저에서도 idle 타이머로 재중심된다', async ({ page }) => {
  // window.onscrollend는 Window 인스턴스의 own property다(프로토타입이 아님).
  // 이걸 지우면 'onscrollend' in window가 false가 되어 loop.js가 idle 타이머
  // 분기를 타면서도, 브라우저의 실제 scrollend 이벤트 발생 여부와는 무관하다.
  await page.addInitScript(() => {
    delete window.onscrollend;
  });

  await ready(page, '/test/fixtures/loop.html');
  // 분기가 실제로 idle 타이머 쪽인지 확인한다 — scrollend 가드가 꺼져 있어야 한다.
  expect(await page.evaluate(() => 'onscrollend' in window)).toBe(false);

  await page.waitForFunction(() => document.querySelector('#c1').carousel.slideIndex === 3);

  await jumpToThirdSetAndWaitForRecenter(page);

  const state = await page.evaluate(() => {
    const c = document.querySelector('#c1').carousel;
    return { slideIndex: c.slideIndex, index: c.index };
  });
  expect(state.slideIndex).toBe(3);
  expect(state.index).toBe(0);
});

// ── 클론 결함 수정 ─────────────────────────────────

// 마커는 pseudo-element라 셀렉터로 잡을 수 없다. fallback-markers.spec.js /
// vertical.spec.js와 같은 CDP Accessibility.getFullAXTree로 tab role 수를 센다.
test('네이티브: loop가 켜져도 마커는 복제본이 아니라 원본 수만큼만 노출된다', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'CDP는 Chromium 전용');
  await ready(page, '/test/fixtures/loop-markers.html');
  test.skip(!(await isNative(page)), '네이티브 미지원 브라우저');

  const session = await context.newCDPSession(page);
  const { nodes } = await session.send('Accessibility.getFullAXTree');
  await session.detach();

  const tabs = nodes.map((node) => node.role?.value).filter((role) => role === 'tab');
  expect(tabs).toHaveLength(6);
});

test('폴백: loop가 켜져도 마커는 원본(carousel.items) 수만큼만 생성된다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop-markers.html');
  test.skip(await isNative(page), '네이티브 지원 브라우저');

  await expect(page.locator('#c1 .carousel-marker')).toHaveCount(6);
});

test('복제본의 id는 제거되어 저자가 준 id가 중복되지 않는다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop.html');

  const counts = await page.evaluate(() => ({
    slide: document.querySelectorAll('#slide-2').length,
    label: document.querySelectorAll('#slide-2-label').length,
  }));
  expect(counts).toEqual({ slide: 1, label: 1 });
});

// ── 격리·정리 수정 ─────────────────────────────────

test('잘못 설정된 manual loop가 이후 carousel의 초기화를 막지 않는다', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/test/fixtures/loop-cascade.html');
  // DOM 순서상 잘못된 #bad가 먼저 처리되고 그 뒤에 #good이 처리된다.
  // #good이 초기화됐다는 것 자체가 #bad의 throw가 initAll의 for 루프를
  // 통째로 멈추지 않았다는 증거다.
  await page.waitForFunction(() => !!document.querySelector('#good')?.carousel);

  const state = await page.evaluate(() => ({
    goodSlides: document.querySelector('#good').carousel.slides.length,
    // #bad는 Carousel 생성자까지는 성공하지만(그래서 root.carousel은 존재한다)
    // applyLoop의 throw로 setSize 할당 전에 멈추므로 setSize는 null로 남는다.
    badSetSize: document.querySelector('#bad').carousel?.setSize ?? null,
  }));
  expect(state.goodSlides).toBe(3);
  expect(state.badSetSize).toBeNull();

  // 에러를 삼키지 않고 console.error로 드러냈는지 확인한다.
  await expect.poll(() => errors.some((text) => text.includes('css-carousel'))).toBe(true);
});

test('destroy가 자동 복제본을 제거하고, 재초기화하면 다시 3세트가 된다', async ({ page }) => {
  await ready(page, '/test/fixtures/loop.html');

  const afterDestroy = await page.evaluate(() => {
    const root = document.querySelector('#c1');
    const carousel = root.carousel;
    carousel.destroy();
    return {
      clones: root.querySelectorAll('[data-carousel-clone]').length,
      slides: carousel.slides.length,
    };
  });
  expect(afterDestroy).toEqual({ clones: 0, slides: 3 });

  await page.evaluate(() => window.Carousel.init(document.querySelector('#c1')));
  await page.waitForFunction(() => document.querySelector('#c1')?.carousel?.setSize != null);

  const slidesAfterReinit = await page.evaluate(
    () => document.querySelector('#c1').carousel.slides.length,
  );
  expect(slidesAfterReinit).toBe(9);
});
