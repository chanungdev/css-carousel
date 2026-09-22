/**
 * 데모가 라이브러리·자기 자신과 어긋나지 않았는지 검사한다.
 *
 * 데모는 문서 역할을 겸한다 — 코드 블록에 적힌 변수 이름 하나가 틀려도
 * 빌드는 멀쩡히 성공하고, 그걸 복사해 간 사람만 안 되는 코드를 얻는다.
 * README에는 check-readme.js가 있지만 데모에는 없었다. 이 스크립트가 그 자리다.
 *
 * 검사하는 것:
 *   1. 데모가 쓴 --carousel-* 변수가 라이브러리에 존재하는가
 *   2. 데모가 쓴 data-carousel* 속성이 라이브러리에 존재하는가
 *   3. demo.js가 찾는 #id가 마크업에 있는가 (CSS·JS를 파일로 분리한 뒤 생긴 위험)
 *   4. 2단 메뉴의 앵커가 자기 페이지 안에 있고, 1단 메뉴의 페이지가 실재하는가
 *   5. 페이지마다 테마 메뉴와 playground 마크업이 같은가
 *   6. 참조된 카드 이미지가 실제로 있는가
 */
import { readFile, readdir } from 'node:fs/promises';

const read = (path) => readFile(path, 'utf8');
const all = (text, pattern) => [...text.matchAll(pattern)].map((m) => m[1]);
const failures = [];

const fail = (message) => failures.push(message);

// ── 라이브러리 어휘 수집 ────────────────────────────
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

// ── 데모 쪽 사용처 ──────────────────────────────────
const PAGES = ['demo/index.html', 'demo/progress.html'];
const DEMO = [...PAGES, 'demo/demo.css', 'demo/demo.js'];
const demoTexts = Object.fromEntries(
  await Promise.all(DEMO.map(async (path) => [path, await read(path)])),
);

// 데모 전용 변수는 --carousel- 접두사를 쓰지 않으므로 전부 라이브러리 것이어야 한다
for (const [path, text] of Object.entries(demoTexts)) {
  for (const name of new Set(all(text, /(--carousel-[a-z0-9-]+)/g))) {
    if (!libraryVars.has(name)) fail(`${path}: 라이브러리에 없는 변수 ${name}`);
  }
  for (const name of new Set(all(text, /\b(data-carousel[a-z-]*)/g))) {
    if (!libraryAttrs.has(name)) fail(`${path}: 라이브러리에 없는 속성 ${name}`);
  }
}

// ── demo.js가 찾는 id가 어느 페이지엔가 있는가 ───────
// demo.js는 두 페이지가 공유한다. 페이지마다 섹션 구성이 달라 각 블록은
// 요소가 있을 때만 배선하므로, 어느 한 페이지에만 있으면 정상이다.
// 여기서 잡는 건 오타와 이름 변경이다.
const allIds = new Set(PAGES.flatMap((page) => all(demoTexts[page], /\bid="([^"]+)"/g)));

// 따옴표 안의 선택자에서만 #id를 뽑는다 (색상값 #fff 같은 것과 섞이지 않게)
for (const selector of all(demoTexts['demo/demo.js'], /'([^']*#[^']*)'/g)) {
  for (const id of all(selector, /#([a-zA-Z][\w-]*)/g)) {
    if (!allIds.has(id)) fail(`demo/demo.js: 어느 페이지에도 없는 #${id}`);
  }
}

// ── 메뉴 링크 ───────────────────────────────────────
// 2단(앵커)은 자기 페이지 안에서, 1단(페이지)은 실제 파일이어야 한다.
for (const page of PAGES) {
  const text = demoTexts[page];
  const ids = new Set(all(text, /\bid="([^"]+)"/g));

  for (const href of all(text, /<a href="#([^"]+)"/g)) {
    if (!ids.has(href)) fail(`${page}: 메뉴가 가리키는 #${href} 섹션이 없다`);
  }
  for (const href of all(text, /<a href="\.\/([^"#]+\.html)"/g)) {
    if (!PAGES.includes(`demo/${href}`)) fail(`${page}: 메뉴가 가리키는 ${href} 페이지가 없다`);
  }
}

// 모든 페이지가 같은 테마 메뉴를 들고 있어야 한다 — 한쪽만 고치면 길이 끊긴다
const themeMenus = PAGES.map((page) =>
  all(demoTexts[page], /<li><a href="(\.\/[^"]+\.html)"/g).join(','),
);
if (new Set(themeMenus).size > 1) {
  fail(`페이지마다 테마 메뉴가 다르다 — ${themeMenus.join(' vs ')}`);
}

// ── playground 마크업 ───────────────────────────────
// 같은 playground가 페이지마다 복사돼 있다. 한쪽에만 컨트롤을 추가하면
// 그 페이지에서만 동작해 조용히 갈라진다.
const playgrounds = PAGES.map((page) => {
  const match = demoTexts[page].match(/ {2}<section id="playground">[\s\S]*?\n {2}<\/section>/);
  return match ? match[0] : null;
});
if (playgrounds.some((block) => block === null)) {
  fail(`playground 섹션이 없는 페이지가 있다 — ${PAGES.filter((_, i) => !playgrounds[i]).join(', ')}`);
} else if (new Set(playgrounds).size > 1) {
  fail('페이지마다 playground 마크업이 다르다 — 한쪽에만 컨트롤을 추가했나?');
}

// ── 카드 이미지 ─────────────────────────────────────
const cards = new Set(await readdir('demo/cards'));
for (const [path, text] of Object.entries(demoTexts)) {
  for (const file of new Set(all(text, /\.\/cards\/([^"')]+)/g))) {
    // demo.js는 이름을 템플릿으로 만든다 — 그건 아래 연속성 검사가 대신 본다
    if (file.includes('$')) continue;
    if (!cards.has(file)) fail(`${path}: demo/cards/${file} 가 없다`);
  }
}

// demo.js는 카드 이름을 01..08로 만들어 붙인다. 파일이 그만큼 없으면 조용히 깨진다.
for (let n = 1; n <= 8; n++) {
  const name = `0${n}.svg`;
  if (!cards.has(name)) fail(`demo/cards/${name} 가 없다 (demo.js가 01..08을 순환한다)`);
}

if (failures.length > 0) {
  console.error('check-demo 실패:');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(
  `데모 일치: 변수 ${libraryVars.size}개, 속성 ${libraryAttrs.size}개, id ${allIds.size}개, 카드 ${cards.size}개`,
);
