/**
 * 문서 사이트가 라이브러리·자기 자신과 어긋나지 않았는지 검사한다.
 *
 * 문서는 복사해 가라고 있는 것이다. 변수 이름 하나가 틀려도 빌드는 멀쩡히
 * 성공하고, 그걸 복사해 간 사람만 안 되는 코드를 얻는다. README에는
 * check-readme.js가 있고, 사이트에는 이 스크립트가 그 자리다.
 *
 * 검사하는 것:
 *   1. 문서가 쓴 --carousel-* 변수가 라이브러리에 존재하는가
 *   2. 문서가 쓴 data-carousel* 속성이 라이브러리에 존재하는가
 *   3. 내부 링크가 실제 문서 페이지를 가리키는가
 *   4. 참조된 카드 이미지가 실제로 있는가
 *
 * 예전 check-demo.js가 보던 "코드 블록과 실제 마크업이 같은가"는 여기 없다.
 * Demo 컴포넌트가 문자열 하나를 렌더링과 코드 블록 양쪽에 쓰므로 갈라질 수가
 * 없어졌다 — 구조로 막은 것은 검사할 필요가 없다.
 */
import { readFile, readdir } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');
const all = (text, pattern) => [...text.matchAll(pattern)].map((m) => m[1]);
const failures = [];
const fail = (message) => failures.push(message);

// ── 라이브러리 어휘 ─────────────────────────────────
// 정의된 것만이 아니라 src에 등장하는 이름 전체를 어휘로 본다.
// 오타는 어느 쪽에도 없으므로 그대로 걸린다.
const SRC = [
  'src/carousel.css',
  'src/effects.css',
  'src/themes/basic.css',
  'src/themes/progress.css',
  'src/index.ts',
  'src/instance.ts',
  'src/fallback.ts',
  'src/loop.ts',
  'src/autoplay.ts',
  'src/thumbs.ts',
  'src/support.ts',
];

const source = (await Promise.all(SRC.map(read))).join('\n');
const libraryVars = new Set(all(source, /(--carousel-[a-z0-9-]+)/g));
const libraryAttrs = new Set(all(source, /\b(data-carousel[a-z-]*)/g));

// ── 사이트 소스 모으기 ──────────────────────────────
const DOCS_DIR = 'site/src/content/docs';

const walk = async (dir) => {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else found.push(path);
  }
  return found;
};

const docFiles = (await walk(DOCS_DIR)).filter((p) => /\.mdx?$/.test(p));
const componentFiles = (await readdir('site/src/components')).map(
  (name) => `site/src/components/${name}`,
);
const siteFiles = [...docFiles, ...componentFiles];
const texts = Object.fromEntries(
  await Promise.all(siteFiles.map(async (path) => [path, await read(path)])),
);

for (const [path, text] of Object.entries(texts)) {
  for (const name of new Set(all(text, /(--carousel-[a-z0-9-]+)/g))) {
    // 산문에서 --carousel-button-* 처럼 접두사만 적는 경우가 있다
    if (name.endsWith('-')) continue;
    if (!libraryVars.has(name)) fail(`${path}: 라이브러리에 없는 변수 ${name}`);
  }
  for (const name of new Set(all(text, /\b(data-carousel[a-z-]*)/g))) {
    if (!libraryAttrs.has(name)) fail(`${path}: 라이브러리에 없는 속성 ${name}`);
  }
}

// ── 내부 링크 ───────────────────────────────────────
// base는 astro.config에 한 번만 적혀 있다. 여기서 다시 적으면 둘이 갈라진다.
const config = await read('site/astro.config.mjs');
const base = config.match(/base:\s*'([^']+)'/)?.[1];
if (!base) fail('site/astro.config.mjs에서 base를 찾지 못했다');

const routes = new Set(
  docFiles.map((path) => {
    const slug = path.slice(DOCS_DIR.length + 1).replace(/\.mdx?$/, '');
    return slug === 'index' ? `${base}/` : `${base}/${slug}/`;
  }),
);

for (const [path, text] of Object.entries(texts)) {
  // 앞에 글자나 슬래시가 붙어 있으면 URL 일부다 (unpkg.com/snapstrip/dist/… 같은 것)
  for (const href of new Set(all(text, new RegExp(`(?<![\\w/.])(${base}/[^)"'\\s]*)`, 'g')))) {
    // 카드 이미지는 아래에서 따로 본다
    if (href.includes('/cards/')) continue;
    if (!routes.has(href)) fail(`${path}: 없는 페이지를 가리킨다 — ${href}`);
  }
}

// ── 카드 이미지 ─────────────────────────────────────
// lib/cards.ts가 CARD_COUNT 만큼 이름을 만들어 붙인다. 파일이 그만큼 없으면
// 조용히 깨진 이미지가 된다. 개수는 cards.ts에서 읽어 와 두 군데 적히지 않게 한다.
const cards = new Set(await readdir('site/public/cards'));
const cardCount = Number(
  (await read('site/src/lib/cards.ts')).match(/CARD_COUNT = (\d+)/)?.[1] ?? 0,
);
if (!cardCount) fail('site/src/lib/cards.ts 에서 CARD_COUNT를 찾지 못했다');

for (let n = 1; n <= cardCount; n++) {
  const name = `${String(n).padStart(2, '0')}.svg`;
  if (!cards.has(name))
    fail(`site/public/cards/${name} 가 없다 (cards.ts가 ${cardCount}장을 순환한다)`);
}

if (failures.length > 0) {
  console.error('check-site 실패:');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(
  `문서 일치: 변수 ${libraryVars.size}개, 속성 ${libraryAttrs.size}개, ` +
    `페이지 ${routes.size}개, 카드 ${cards.size}개`,
);
