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
      withCode: sections.filter((s) => s.querySelector('details.code')).length,
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
