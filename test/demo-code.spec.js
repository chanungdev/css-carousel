import { test, expect } from '@playwright/test';

// 데모의 "코드 보기" 블록은 손으로 쓴 것이라 실제 마크업과 어긋날 수 있다.
// 이 프로젝트에서 문서가 사실과 달라진 적이 여러 번 있었으므로, 최소한
// 속성 수준에서는 자동으로 붙잡는다.

const ready = async (page) => {
  await page.goto('/demo/index.html');
  await page.waitForFunction(() => !!document.querySelector('#fx')?.carousel);
};

test('모든 섹션이 코드 블록을 갖고, 기본적으로 접혀 있다', async ({ page }) => {
  await ready(page);
  const stats = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('section')];
    return {
      sections: sections.length,
      // playground는 생성된 코드를 항상 펼쳐 보여주므로 토글이 아니다.
      withCode: sections.filter((s) => s.querySelector('details.code, .code-live')).length,
      open: [...document.querySelectorAll('details.code')].filter((d) => d.open).length,
    };
  });
  expect(stats.withCode).toBe(stats.sections);
  expect(stats.open).toBe(0);
});

test('토글이 동작한다', async ({ page }) => {
  await ready(page);
  const details = page.locator('details.code').first();
  await expect(details).not.toHaveAttribute('open', '');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await details.locator('summary').click();
  await expect(details).not.toHaveAttribute('open', '');
});

test('코드에 적힌 data-carousel-* 속성이 실제 섹션에 존재한다', async ({ page }) => {
  await ready(page);

  const mismatches = await page.evaluate(() => {
    const problems = [];
    for (const section of document.querySelectorAll('section')) {
      const code = section.querySelector('details.code')?.textContent ?? '';
      // 코드 블록에 등장하는 동작 속성만 본다. 레이아웃은 CSS 변수라 대상이 아니다.
      const named = new Set(code.match(/data-carousel-[a-z-]+/g) ?? []);
      // 셀렉터 예시로 등장하는 것들은 실제 요소 속성이 아니다
      named.delete('data-carousel-scroller');
      named.delete('data-carousel-marquee-track');

      const live = new Set();
      for (const el of section.querySelectorAll('*')) {
        for (const attr of el.getAttributeNames()) {
          if (attr.startsWith('data-carousel-')) live.add(attr);
        }
      }

      for (const attr of named) {
        if (!live.has(attr)) {
          problems.push(`${section.querySelector('h2')?.textContent?.trim()}: 코드에는 ${attr}가 있는데 실제 마크업에는 없음`);
        }
      }
    }
    return problems;
  });

  expect(mismatches).toEqual([]);
});

test.describe('playground', () => {
  const state = (page) =>
    page.evaluate(() => {
      const root = document.querySelector('#pg');
      return {
        html: document.querySelector('#pg-html').textContent ?? '',
        css: document.querySelector('#pg-css').textContent ?? '',
        items: getComputedStyle(root).getPropertyValue('--carousel-items').trim(),
        hasInstance: !!root.carousel,
        attrs: root.getAttributeNames().filter((a) => a.startsWith('data-carousel')),
      };
    });

  test('초기 상태에서 코드가 실제 적용값과 일치한다', async ({ page }) => {
    await ready(page);
    const s = await state(page);
    expect(s.hasInstance).toBe(true);
    expect(s.css).toContain(`--carousel-items: ${s.items}`);
  });

  // 모듈은 init() 시점에 배선된다. 속성만 바꾸면 붙지 않으므로 playground는
  // destroy() 후 다시 만든다 — 그게 실제로 되는지 확인한다.
  test('loop을 켜면 인스턴스가 다시 만들어지고 setSize가 붙는다', async ({ page }) => {
    await ready(page);
    expect(await page.evaluate(() => document.querySelector('#pg').carousel.setSize)).toBeNull();

    await page.locator('#pg-loop').check();
    await page.waitForFunction(() => document.querySelector('#pg')?.carousel?.setSize != null);

    const s = await state(page);
    expect(s.attrs).toContain('data-carousel-loop');
    expect(s.html).toContain('data-carousel-loop');
  });

  test('컨트롤을 바꾸면 코드가 따라 바뀐다', async ({ page }) => {
    await ready(page);
    await page.locator('#pg-align').selectOption('center');
    await page.locator('#pg-effect').selectOption('fade');

    const s = await state(page);
    expect(s.css).toContain('--carousel-align: center');
    expect(s.html).toContain('data-carousel-effect="fade"');
    expect(s.attrs).toContain('data-carousel-effect');
  });

  // 기본값과 같은 선언은 적지 않는다 — 붙여넣을 코드가 짧아야 쓸모가 있다.
  test('기본값과 같은 설정은 코드에 적지 않는다', async ({ page }) => {
    await ready(page);
    const s = await state(page);
    expect(s.css).not.toContain('--carousel-align');
    expect(s.css).not.toContain('--carousel-snap');
  });
});
