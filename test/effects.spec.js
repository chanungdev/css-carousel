import { test, expect } from '@playwright/test';

test('이펙트가 걸려도 carousel 동작이 유지된다', async ({ page }) => {
  await page.goto('/test/fixtures/effects.html');
  await page.waitForFunction(() => !!document.querySelector('#c1').carousel);

  await page.evaluate(() => document.querySelector('#c1').carousel.goTo(2, 'instant'));
  await page.waitForFunction(() => document.querySelector('#c1').carousel.index === 2);
  expect(await page.evaluate(() => document.querySelector('#c1').carousel.index)).toBe(2);
});

test('지원 브라우저에서 이펙트 애니메이션이 붙는다', async ({ page }) => {
  await page.goto('/test/fixtures/effects.html');
  const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
  test.skip(!supported, 'scroll-driven animation 미지원 브라우저');

  const style = await page
    .locator('#c1 [data-carousel-scroller] > li')
    .first()
    .evaluate((el) => ({
      name: getComputedStyle(el).animationName,
      timeline: getComputedStyle(el).animationTimeline,
    }));
  expect(style.name).toBe('carousel-fade');
  // animation-name만으로는 animation-timeline이 실제로 view()에 붙었는지 알 수 없다 —
  // 그 규칙만 지워도 animation-name은 그대로 남아 이 검증을 헛것으로 만든다.
  expect(style.timeline).toBe('view(inline)');
});

test.describe('reveal 프리셋', () => {
  const styles = (page) =>
    page.evaluate(() => {
      const slide = document.querySelector('#c1 [data-carousel-scroller] > li');
      const media = slide.querySelector('img');
      return {
        slideName: getComputedStyle(slide).animationName,
        slideTimeline: getComputedStyle(slide).animationTimeline,
        slideOverflow: getComputedStyle(slide).overflowX,
        mediaName: getComputedStyle(media).animationName,
        mediaTimeline: getComputedStyle(media).animationTimeline,
      };
    });

  test('슬라이드와 안쪽 미디어에 각각 애니메이션이 붙는다', async ({ page }) => {
    await page.goto('/test/fixtures/effects-reveal.html');
    test.skip(
      !(await page.evaluate(() => CSS.supports('animation-timeline: view()'))),
      'scroll-driven animation 미지원 브라우저',
    );

    const style = await styles(page);
    expect(style.slideName).toBe('carousel-reveal');
    expect(style.slideTimeline).toBe('view(inline)');
    // 커튼이 열리는 동안 미디어가 프레임 밖으로 나가지 않아야 한다
    expect(style.slideOverflow).toBe('clip');
    // 미디어의 역방향 이동이 이 프리셋의 핵심 — 없으면 단순 와이프에 그친다
    expect(style.mediaName).toBe('carousel-reveal-media');
    expect(style.mediaTimeline).toBe('view(inline)');
  });

  test('블록 축에서는 비활성화된다', async ({ page }) => {
    await page.goto('/test/fixtures/effects-reveal.html');
    test.skip(
      !(await page.evaluate(() => CSS.supports('animation-timeline: view()'))),
      'scroll-driven animation 미지원 브라우저',
    );

    // clip-path와 translate는 물리 축이라 세로 스크롤에서는 방향이 어긋난다.
    // 틀린 방향으로 움직이느니 아무 효과도 주지 않는 쪽이 낫다.
    await page.locator('#c1').evaluate((el) => el.setAttribute('data-carousel-axis', 'block'));
    const style = await styles(page);
    expect(style.slideName).toBe('none');
    expect(style.mediaName).toBe('none');
  });

  test('reduced motion에서는 슬라이드와 미디어 모두 멈춘다', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/test/fixtures/effects-reveal.html');

    const style = await styles(page);
    expect(style.slideName).toBe('none');
    expect(style.mediaName).toBe('none');
  });
});

test('marquee 트랙이 애니메이션된다', async ({ page }) => {
  await page.goto('/test/fixtures/marquee.html');
  const style = await page.locator('#m1 [data-carousel-marquee-track]').evaluate((el) => ({
    name: getComputedStyle(el).animationName,
    state: getComputedStyle(el).animationPlayState,
  }));
  expect(style.name).toBe('carousel-marquee');
  expect(style.state).toBe('running');
});

test('marquee는 hover에서 멈춘다', async ({ page }) => {
  await page.goto('/test/fixtures/marquee.html');
  await page.locator('#m1').hover();
  const state = await page
    .locator('#m1 [data-carousel-marquee-track]')
    .evaluate((el) => getComputedStyle(el).animationPlayState);
  expect(state).toBe('paused');
});

test('marquee는 reduced motion에서 멈춘다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/test/fixtures/marquee.html');
  const state = await page
    .locator('#m1 [data-carousel-marquee-track]')
    .evaluate((el) => getComputedStyle(el).animationPlayState);
  expect(state).toBe('paused');
});
