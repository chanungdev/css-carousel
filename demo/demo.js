// snapstrip 데모 페이지 스크립트. 라이브러리가 아니라 데모 전용이다.
//
// 테마마다 페이지가 따로 있고(index.html = basic, progress.html = progress)
// 이 파일을 둘 다 불러온다. 섹션 구성이 페이지마다 다르므로 각 블록은
// 자기가 다룰 요소가 있을 때만 배선한다.

import { Carousel } from '/src/index.js';

// ── sticky 메뉴 높이를 앵커 여백에 반영 ──────────────
// 메뉴는 좁은 화면에서 줄바꿈되며 높아진다. CSS에 적어 둔 값은 곧 낡으므로
// 실측값을 변수로 돌려준다 (CSS 쪽 값은 스크립트 없을 때의 근삿값).

const nav = document.querySelector('.nav');
if (nav) {
  const syncNavHeight = () =>
    document.documentElement.style.setProperty('--nav-block', `${nav.offsetHeight}px`);
  syncNavHeight();
  new ResizeObserver(syncNavHeight).observe(nav);
}

// ── 현재 실행 경로 배지 ─────────────────────────────

const path = document.querySelector('#path');
if (path) {
  path.textContent = CSS.supports('selector(::scroll-marker)')
    ? '네이티브 — 버튼·도트·키보드를 브라우저가 만든다 (JS 미사용)'
    : '폴백 — 스크립트가 동등한 버튼·도트·tablist를 주입한다';
}

// ── 명령형 API ──────────────────────────────────────

const gallery = document.querySelector('#main-gallery');
if (gallery) {
  document.querySelector('#prev').addEventListener('click', () => gallery.carousel.prev());
  document.querySelector('#next').addEventListener('click', () => gallery.carousel.next());
  document.querySelector('#goto').addEventListener('click', () => gallery.carousel.goTo(4));

  const log = document.querySelector('#log');
  gallery.addEventListener('carousel:change', (event) => {
    log.textContent = `carousel:change → index ${event.detail.index}`;
  });

  // 수동 초기화도 가능하다는 표시 (auto-init이 이미 처리했으므로 같은 인스턴스가 돌아온다)
  console.log('instance reused:', Carousel.init(gallery) === gallery.carousel);
}

// ── playground ──────────────────────────────────────
// 설정 표면이 CSS 변수 + data-* 속성이라 컨트롤이 그대로 대응된다.
// 코드 패널은 실제 적용된 상태에서 만들어지므로 손으로 맞출 일이 없다.

const pg = document.querySelector('#pg');
if (pg) {
  pg.querySelectorAll('[data-carousel-scroller] > li').forEach((li, i) => {
    const img = document.createElement('img');
    img.alt = '';
    img.src = `./cards/0${(i % 8) + 1}.svg`;
    li.append(img);
  });

  const pgEl = (id) => document.querySelector('#' + id);
  const pgControls = {
    items: pgEl('pg-items'),
    gap: pgEl('pg-gap'),
    align: pgEl('pg-align'),
    snap: pgEl('pg-snap'),
    scrollbar: pgEl('pg-scrollbar'),
    axis: pgEl('pg-axis'),
    effect: pgEl('pg-effect'),
    loop: pgEl('pg-loop'),
    autoplay: pgEl('pg-autoplay'),
    resume: pgEl('pg-resume'),
    counter: pgEl('pg-counter'),
  };

  // 라이브러리 기본값. 이것과 같은 값은 코드에 안 적는다 — 붙여넣을 코드가 짧아진다.
  const PG_DEFAULTS = { align: 'start', snap: 'mandatory', scrollbar: 'auto' };

  const pgState = () => ({
    items: pgControls.items.value,
    gap: `${pgControls.gap.value}rem`,
    align: pgControls.align.value,
    snap: pgControls.snap.value,
    scrollbar: pgControls.scrollbar.value,
    axis: pgControls.axis.value,
    effect: pgControls.effect.value,
    loop: pgControls.loop.checked,
    autoplay: pgControls.autoplay.checked,
    resume: pgControls.resume.checked,
    counter: pgControls.counter.checked,
  });

  const pgRenderCode = (s) => {
    const attrs = ['data-carousel'];
    if (s.axis === 'block') attrs.push('data-carousel-axis="block"');
    if (s.loop) attrs.push('data-carousel-loop');
    if (s.autoplay) attrs.push('data-carousel-autoplay="2600"');
    if (s.autoplay && s.resume) attrs.push('data-carousel-autoplay-resume="5000"');
    if (s.effect) attrs.push(`data-carousel-effect="${s.effect}"`);
    if (s.counter) attrs.push('data-carousel-counter');

    const open =
      attrs.length > 2
        ? `<div\n  ${attrs.join('\n  ')}\n  class="gallery"\n>`
        : `<div ${attrs.join(' ')} class="gallery">`;
    pgEl('pg-html').textContent =
      `${open}\n  <ul data-carousel-scroller>\n    <li>…</li>\n  </ul>\n</div>`;

    const decls = [`--carousel-items: ${s.items};`, `--carousel-gap: ${s.gap};`];
    if (s.align !== PG_DEFAULTS.align) decls.push(`--carousel-align: ${s.align};`);
    if (s.snap !== PG_DEFAULTS.snap) decls.push(`--carousel-snap: ${s.snap};`);
    if (s.scrollbar !== PG_DEFAULTS.scrollbar) decls.push(`--carousel-scrollbar: ${s.scrollbar};`);

    let css = `.gallery {\n  ${decls.join('\n  ')}\n}`;
    if (s.axis === 'block') {
      css +=
        '\n\n/* 블록 축은 스크롤러에 확정된 block-size가 필요하다 —\n' +
        '   flex-basis의 100%가 주축 크기를 기준으로 풀리기 때문. */\n' +
        '.gallery [data-carousel-scroller] { block-size: 22rem; }';
    }
    if (s.effect) css = `@import 'snapstrip/effects.css';\n\n${css}`;
    pgEl('pg-css').textContent = css;
  };

  const pgApply = () => {
    const s = pgState();

    pg.style.setProperty('--carousel-items', s.items);
    pg.style.setProperty('--carousel-gap', s.gap);
    pg.style.setProperty('--carousel-align', s.align);
    pg.style.setProperty('--carousel-snap', s.snap);
    pg.style.setProperty('--carousel-scrollbar', s.scrollbar);

    const scroller = pg.querySelector('[data-carousel-scroller]');
    scroller.style.blockSize = s.axis === 'block' ? '22rem' : '';

    const attrs = {
      'data-carousel-axis': s.axis === 'block' ? 'block' : null,
      'data-carousel-loop': s.loop ? '' : null,
      'data-carousel-autoplay': s.autoplay ? '2600' : null,
      'data-carousel-autoplay-resume': s.autoplay && s.resume ? '5000' : null,
      'data-carousel-effect': s.effect || null,
      'data-carousel-counter': s.counter ? '' : null,
    };
    for (const [name, value] of Object.entries(attrs)) {
      if (value === null) pg.removeAttribute(name);
      else pg.setAttribute(name, value);
    }

    // loop·autoplay·폴백 컨트롤은 init() 시점에 배선된다. 속성만 바꿔서는
    // 붙지 않으므로 문서화된 경로대로 다시 만든다.
    pg.carousel?.destroy();
    Carousel.init(pg);

    pgRenderCode(s);
  };

  pgEl('pg-items').addEventListener('input', () => {
    pgEl('pg-items-out').textContent = pgControls.items.value;
  });
  pgEl('pg-gap').addEventListener('input', () => {
    pgEl('pg-gap-out').textContent = `${pgControls.gap.value}rem`;
  });
  for (const control of Object.values(pgControls)) {
    control.addEventListener('change', pgApply);
  }
  pgApply();
}
