import { test, expect } from '@playwright/test';

const isNative = (page) => page.evaluate(() => CSS.supports('selector(::scroll-marker)'));
const supportsView = (page) => page.evaluate(() => CSS.supports('animation-timeline: view()'));
const supportsScroll = (page) => page.evaluate(() => CSS.supports('animation-timeline: scroll()'));

const ready = async (page) => {
  await page.goto('/test/fixtures/theme-progress.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);
};

test('마커가 점이 아니라 막대 조각이다', async ({ page }) => {
  await ready(page);
  test.skip(await isNative(page), '폴백 마커가 있는 브라우저 전용');

  const box = await page.locator('#c1 .carousel-marker').first().boundingBox();
  // 가로로 길고 세로로 납작해야 막대로 읽힌다
  expect(box.width).toBeGreaterThan(box.height * 3);
});

test('마커가 간격 없이 맞붙어 하나의 트랙이 된다', async ({ page }) => {
  await ready(page);
  test.skip(await isNative(page), '폴백 마커가 있는 브라우저 전용');

  const boxes = await page.locator('#c1 .carousel-marker').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return [r.x, r.right];
    }),
  );

  for (let i = 1; i < boxes.length; i++) {
    // 앞 조각의 오른쪽 끝 == 다음 조각의 왼쪽 끝
    expect(Math.abs(boxes[i][0] - boxes[i - 1][1])).toBeLessThan(1);
  }
});

// 스크롤 타임라인이 없는 브라우저(Firefox)는 진행 바를 못 그린다. 그쪽은
// 조각 단위로 물러서서, 현재 조각만 좌→우로 채워진다.
test.describe('현재 마커 채움 (스크롤 타임라인 없는 경로)', () => {
  test.beforeEach(async ({ page }) => {
    await ready(page);
    test.skip(await supportsScroll(page), '진행 바가 조각별 채움을 대신하는 브라우저');
  });

  // 네이티브는 ::scroll-marker pseudo에, 폴백은 버튼 엘리먼트에 배경이 붙는다.
  // 채움 정도는 background-position 하나로 표현되므로 양쪽을 같은 값으로 읽는다.
  // 100% = 비어 있음, 0% = 가득 참.
  const styleAt = (page, index) =>
    page.evaluate((i) => {
      const root = document.querySelector('#c1');
      const style = CSS.supports('selector(::scroll-marker)')
        ? getComputedStyle(
            root.querySelectorAll('[data-carousel-scroller] > li')[i],
            '::scroll-marker',
          )
        : getComputedStyle(root.querySelectorAll('.carousel-marker')[i]);
      return { fill: parseFloat(style.backgroundPosition), image: style.backgroundImage };
    }, index);

  const fillAt = (page, index) => styleAt(page, index).then((s) => s.fill);

  test('현재 마커만 채워져 있다', async ({ page }) => {
    await expect.poll(() => fillAt(page, 0)).toBe(0);
    expect(await fillAt(page, 1)).toBe(100);
  });

  // 위치만 보면 부족하다 — 현재 상태에서 그라디언트가 날아가도 background-position은
  // 단축 속성 기본값 0%로 떨어져 "가득 참"과 구분되지 않는다. 그러면 채움 없이
  // 통째로 색이 칠해진 막대가 되므로, 그라디언트가 살아 있는지도 확인한다.
  test('현재 마커도 그라디언트를 유지한다', async ({ page }) => {
    await expect.poll(() => fillAt(page, 0)).toBe(0);

    const current = await styleAt(page, 0);
    expect(current.image).toContain('linear-gradient');
  });

  test('채움이 즉시 튀지 않고 좌에서 우로 진행한다', async ({ page }) => {
    await expect.poll(() => fillAt(page, 0)).toBe(0);

    await page.evaluate(() => document.querySelector('#c1').carousel.goTo(1));

    // 0과 100 사이의 중간값이 관측되면 전환이 보간되고 있다는 뜻이다. 값이 즉시
    // 0으로 튀면 프레임마다 확인해도 중간값을 한 번도 보지 못하고 타임아웃 난다.
    await page.waitForFunction(
      () => {
        const root = document.querySelector('#c1');
        const style = CSS.supports('selector(::scroll-marker)')
          ? getComputedStyle(
              root.querySelectorAll('[data-carousel-scroller] > li')[1],
              '::scroll-marker',
            )
          : getComputedStyle(root.querySelectorAll('.carousel-marker')[1]);
        const value = parseFloat(style.backgroundPosition);
        return value > 0 && value < 100;
      },
      null,
      { polling: 'raf', timeout: 2000 },
    );

    await expect.poll(() => fillAt(page, 1)).toBe(0);
  });
});

// "현재보다 앞"은 네이티브 경로에서 CSS로 고를 수 없다(:has()에 pseudo-element를
// 넣을 수 없고, :target-current는 슬라이드가 아니라 마커에 붙는다). 그래서 지나온
// 구간은 조각별이 아니라 마커 그룹 전체를 스크롤 진행률로 채워서 표현한다.
test.describe('진행 바', () => {
  // 네이티브는 ::scroll-marker-group pseudo, 폴백은 .carousel-markers 엘리먼트다.
  const group = (page) =>
    page.evaluate(() => {
      const root = document.querySelector('#c1');
      const scroller = root.querySelector('[data-carousel-scroller]');
      const style = CSS.supports('selector(::scroll-marker)')
        ? getComputedStyle(scroller, '::scroll-marker-group')
        : getComputedStyle(root.querySelector('.carousel-markers'));
      return { size: style.backgroundSize, image: style.backgroundImage, width: style.width };
    });

  // background-size의 첫 레이어가 채움이고, 그 중 첫 토큰이 폭이다
  // (뒤따르는 높이 토큰까지 읽으면 엉뚱한 값이 나온다).
  // 폭은 calc(<퍼센트> + <px>) 형태로 계산된다. 퍼센트 기준은 그룹 폭이다.
  const filledRatio = ({ size, width }) => {
    const layer = size.split(/,(?![^(]*\))/)[0].trim();
    const value = layer.match(/^(calc\([^)]*\)|\S+)/)[1];
    const total = parseFloat(width);
    const both = value.match(/^calc\(([\d.-]+)%\s*\+\s*([\d.-]+)px\)/);
    if (both) return Number(both[1]) / 100 + Number(both[2]) / total;
    if (value.endsWith('%')) return parseFloat(value) / 100;
    return parseFloat(value) / total;
  };

  const scrollToSlide = async (page, index) => {
    await page.evaluate((i) => {
      const scroller = document.querySelector('#c1 [data-carousel-scroller]');
      const slide = scroller.querySelectorAll('li')[i];
      scroller.scrollTo({ left: slide.offsetLeft, behavior: 'instant' });
    }, index);
    await page.waitForFunction(
      () => {
        const scroller = document.querySelector('#c1 [data-carousel-scroller]');
        const previous = window.__settleAt;
        window.__settleAt = scroller.scrollLeft;
        return previous === scroller.scrollLeft;
      },
      null,
      { polling: 'raf' },
    );
  };

  test('스크롤을 진행한 만큼 단조롭게 차오른다', async ({ page }) => {
    await ready(page);
    test.skip(!(await supportsScroll(page)), '스크롤 타임라인 미지원 브라우저');

    const count = await page.locator('#c1 [data-carousel-scroller] > li').count();
    const ratios = [];
    for (let i = 0; i < count; i++) {
      await scrollToSlide(page, i);
      ratios.push(filledRatio(await group(page)));
    }

    // 첫 슬라이드에서도 "여기 있다"가 보여야 한다 — 0이면 빈 트랙만 남는다
    expect(ratios[0]).toBeGreaterThan(0);
    expect(ratios[0]).toBeLessThan(0.5);
    // 마지막 슬라이드에서 가득 찬다
    expect(ratios.at(-1)).toBeCloseTo(1, 2);
    for (let i = 1; i < ratios.length; i++) {
      expect(ratios[i]).toBeGreaterThan(ratios[i - 1]);
    }
  });

  test('트랙이 카운터 앞까지 넓게 뻗는다', async ({ page }) => {
    await ready(page);

    const { width } = await group(page);
    const carousel = await page
      .locator('#c1')
      .evaluate((el) => parseFloat(getComputedStyle(el).width));

    // 조각 폭(1.75rem)만큼만 차지하면 캐러셀 폭의 20%도 안 된다.
    // 카운터 자리를 뺀 나머지를 모두 써야 한다.
    expect(parseFloat(width) / carousel).toBeGreaterThan(0.8);
    expect(parseFloat(width)).toBeLessThan(carousel);
  });

  // 트랙과 카운터가 세로로 어긋나면 한 줄로 읽히지 않는다.
  test('트랙과 카운터의 세로 중앙이 맞는다', async ({ page }) => {
    await ready(page);
    test.skip(!(await supportsView(page)), '카운터가 없는 브라우저');

    const centers = await page.evaluate(() => {
      const root = document.querySelector('#c1');
      const scroller = root.querySelector('[data-carousel-scroller]');
      const track = CSS.supports('selector(::scroll-marker)')
        ? getComputedStyle(scroller, '::scroll-marker-group')
        : getComputedStyle(root.querySelector('.carousel-markers'));
      const counter = getComputedStyle(root.querySelector('[data-carousel-scroller]'), '::after');
      // 둘 다 캐러셀 아래쪽 기준으로 배치된다. 아래 끝 + 높이의 절반이 중심이다.
      const center = (style) => parseFloat(style.bottom) + parseFloat(style.height) / 2;
      return { track: center(track), counter: center(counter) };
    });

    expect(centers.track).toBeCloseTo(centers.counter, 1);
  });

  // 가드가 없으면 키프레임이 문서 타임라인에서 즉시 끝까지 달려, 진행과 무관하게
  // 트랙이 통째로 채워진 채 멈춘다. 틀린 진행률은 없느니만 못하다.
  test('스크롤 타임라인이 없으면 진행 바를 아예 그리지 않는다', async ({ page }) => {
    await ready(page);
    test.skip(await supportsScroll(page), '스크롤 타임라인 지원 브라우저');

    expect((await group(page)).image).toBe('none');
  });
});

test('버튼은 기본적으로 숨어 있다가 hover에서 나타난다', async ({ page }) => {
  await ready(page);
  test.skip(await isNative(page), '폴백 버튼이 있는 브라우저 전용');

  const next = page.locator('#c1 .carousel-button-next');
  await expect(next).toHaveCSS('opacity', '0');

  await page.locator('#c1').hover();
  await expect(next).toHaveCSS('opacity', '1');
});

// 키보드 사용자는 hover를 못 쓴다. 포커스가 안으로 들어오면 버튼이 보여야 한다.
test('포커스가 안에 들어와도 버튼이 나타난다', async ({ page }) => {
  await ready(page);
  test.skip(await isNative(page), '폴백 버튼이 있는 브라우저 전용');

  const next = page.locator('#c1 .carousel-button-next');
  await expect(next).toHaveCSS('opacity', '0');

  await next.focus();
  await expect(next).toHaveCSS('opacity', '1');
});
