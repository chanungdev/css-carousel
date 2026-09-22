import { test, expect } from '@playwright/test';

// 카운터는 테마 기능이 아니라 core의 opt-in이다. 픽스처는 테마 없이
// carousel.css + effects.css만 싣는다 — 실제 사용자가 쓰는 로드 순서다.

const supportsView = (page) => page.evaluate(() => CSS.supports('animation-timeline: view()'));

const ready = async (page) => {
  await page.goto('/test/fixtures/counter.html');
  await page.waitForFunction(() => !!document.querySelector('#on').carousel);
};

// 생성 콘텐츠는 computed style로 값을 읽을 수 없다(counter()가 해석되지 않는다).
// 규칙이 적용됐는지(content가 none이 아닌지)로 본다.
const counterShown = (page, id) =>
  page.evaluate(
    (target) => getComputedStyle(document.querySelector(target + ' [data-carousel-scroller]'), '::after').content !== 'none',
    '#' + id,
  );

const animationOf = (page, id) =>
  page.evaluate(
    (target) =>
      getComputedStyle(document.querySelector(target).querySelector('[data-carousel-scroller] > li'))
        .animationName,
    '#' + id,
  );

test('data-carousel-counter가 없으면 카운터가 붙지 않는다', async ({ page }) => {
  await ready(page);
  expect(await counterShown(page, 'off')).toBe(false);
  // 규칙 자체가 안 걸리므로 카운트 애니메이션도 없어야 한다
  expect(await animationOf(page, 'off')).toBe('none');
});

test('지원 브라우저에서는 속성이 붙은 carousel에만 카운터가 나온다', async ({ page }) => {
  await ready(page);
  test.skip(!(await supportsView(page)), 'scroll-driven animation 미지원 브라우저');

  expect(await counterShown(page, 'on')).toBe(true);
  expect(await counterShown(page, 'off')).toBe(false);
});

// 미지원 브라우저에서는 타임라인 없는 애니메이션이 곧바로 채워져 모든 슬라이드가
// 카운트된다. "5 / 5" 같은 틀린 값을 보여주느니 숨기는 쪽이 낫다.
test('미지원 브라우저에서는 카운터를 숨긴다', async ({ page }) => {
  await ready(page);
  test.skip(await supportsView(page), 'scroll-driven animation 지원 브라우저');
  expect(await counterShown(page, 'on')).toBe(false);
});

// 변수 선언이 엉뚱한 규칙 안으로 새면 var()가 풀리지 않아 알약 배경만 조용히
// 사라진다 — content는 그대로라 위 테스트는 통과한다. 배경도 같이 본다.
test('카운터 알약 배경이 칠해진다', async ({ page }) => {
  await ready(page);
  test.skip(!(await supportsView(page)), 'scroll-driven animation 미지원 브라우저');

  const background = await page.evaluate(
    () => getComputedStyle(document.querySelector('#on [data-carousel-scroller]'), '::after').backgroundColor,
  );
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});

// 카운터와 이펙트 프리셋은 슬라이드의 animation-name이라는 같은 자리를 쓴다.
// core는 effects.css보다 먼저 로드되므로, 게이트 속성이 얹은 특이도만이
// 두 애니메이션을 함께 살린다. import 순서에 기대지 않는다는 뜻이다.
test('이펙트와 함께 써도 둘 다 살아 있다', async ({ page }) => {
  await ready(page);
  test.skip(!(await supportsView(page)), 'scroll-driven animation 미지원 브라우저');

  const name = await animationOf(page, 'fx');
  expect(name).toContain('carousel-count');
  expect(name).toContain('carousel-fade');
});

// 반대 방향도 본다 — 카운터를 안 켠 carousel의 이펙트를 core가 건드리면 안 된다.
test('카운터를 끈 carousel의 이펙트는 그대로다', async ({ page }) => {
  await ready(page);
  const name = await page.evaluate(() => {
    const root = document.querySelector('#fx');
    root.removeAttribute('data-carousel-counter');
    const slide = root.querySelector('[data-carousel-scroller] > li');
    return getComputedStyle(slide).animationName;
  });
  expect(name).toBe('carousel-fade');
});

// 카운터는 슬라이드가 스크롤포트에 "다 들어온" 순간(entry 100%)에 하나씩 센다.
// 절반(entry 50%)에서 세면 --carousel-items가 1보다 클 때 옆에 걸친 슬라이드까지
// 세어 버려서, 앞 카드가 04인데 카운터는 5를 가리킨다.
test('옆에 걸친 슬라이드를 앞질러 세지 않는다', async ({ page }) => {
  await ready(page);
  test.skip(!(await supportsView(page)), 'scroll-driven animation 미지원 브라우저');

  // counter() 값은 computed style로 못 읽지만, 카운트를 올리는 키프레임이
  // 켜졌는지는 슬라이드의 counter-increment로 그대로 보인다.
  const countsFor = (items) =>
    page.evaluate(async (value) => {
      const root = document.querySelector('#on');
      const scroller = root.querySelector('[data-carousel-scroller]');
      root.style.setProperty('--carousel-items', value);
      const slides = [...scroller.querySelectorAll('li')];
      const settle = () =>
        new Promise((resolve) => {
          let last = -1;
          const tick = () => {
            if (scroller.scrollLeft === last) return resolve();
            last = scroller.scrollLeft;
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

      const counted = [];
      for (const slide of slides) {
        scroller.scrollTo({ left: slide.offsetLeft, behavior: 'instant' });
        await settle();
        counted.push(
          slides.filter((el) => getComputedStyle(el).counterIncrement.includes('carousel-current'))
            .length,
        );
      }
      return counted;
    }, items);

  const single = await countsFor('1');
  expect(single).toEqual(single.map((_, i) => i + 1));

  // 1.5개가 보일 때도 앞선 슬라이드 수를 넘기면 안 된다. 끝에서는 더 스크롤할
  // 자리가 없어 같은 값에 머무르므로 증가만 하면 된다.
  const peeking = await countsFor('1.5');
  peeking.forEach((value, i) => {
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(i + 1);
    if (i > 0) expect(value).toBeGreaterThanOrEqual(peeking[i - 1]);
  });
});

// 루트에 container-type: inline-size를 걸면 contain: style이 함께 걸리고,
// 그러면 자손의 counter-increment가 별도 스코프로 갇힌다. 리셋과 출력이 루트에
// 있으면 "0 / 0"이 뜬다 — content는 그대로라 위 테스트들은 전부 통과한다.
// 렌더된 숫자는 읽을 수 없으므로 자릿수에서 오는 폭 차이로 본다.
test('루트가 컨테이너 질의 컨테이너여도 숫자가 맞는다', async ({ page }) => {
  await ready(page);
  test.skip(!(await supportsView(page)), 'scroll-driven animation 미지원 브라우저');

  const widthOf = (id) =>
    page.evaluate(
      (target) =>
        parseFloat(
          getComputedStyle(document.querySelector(target + ' [data-carousel-scroller]'), '::after')
            .width,
        ),
      '#' + id,
    );

  // #contained는 12장이라 "1 / 12", #on은 5장이라 "1 / 5".
  // 깨지면 둘 다 "0 / 0"이 되어 폭이 같아진다.
  expect(await widthOf('contained')).toBeGreaterThan(await widthOf('on'));
});
