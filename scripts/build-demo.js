/**
 * 데모를 정적 호스팅(GitHub Pages)용으로 빌드한다.
 *
 * 로컬 개발은 scripts/serve.js가 src/를 직접 서빙하고 .ts를 즉석 변환한다.
 * 정적 호스팅에는 그런 게 없으므로 두 가지를 여기서 해결한다:
 *
 *   1. TypeScript를 번들로 미리 만든다 — 정적 서버는 .ts를 실행할 수 없다.
 *   2. 절대 경로(/src/...)를 상대 경로로 바꾼다 — 프로젝트 사이트는
 *      /<repo>/ 아래로 서빙되므로 절대 경로가 루트를 잘못 가리킨다.
 */
import { build } from 'esbuild';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const OUT = 'dist-demo';

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  outfile: `${OUT}/carousel.js`,
});

await copyFile('src/carousel.css', `${OUT}/carousel.css`);
await copyFile('src/effects.css', `${OUT}/effects.css`);
await copyFile('src/themes/basic.css', `${OUT}/basic.css`);
await copyFile('src/themes/progress.css', `${OUT}/progress.css`);

// 카드 이미지는 demo/ 기준 상대 경로(./cards/…)로 참조되므로 경로 재작성이 필요 없다.
// 디렉터리 구조만 그대로 옮기면 된다.
await cp('demo/cards', `${OUT}/cards`, { recursive: true });

// 데모가 참조하는 경로를 빌드 산출물로 옮긴다. 치환이 하나라도 빗나가면
// 배포본이 조용히 깨지므로, 기대한 만큼 바뀌었는지 확인한다.
const REWRITES = [
  ['/src/carousel.css', './carousel.css'],
  ['/src/effects.css', './effects.css'],
  ['/src/themes/basic.css', './basic.css'],
  ['/src/themes/progress.css', './progress.css'],
  ['/src/index.js', './carousel.js'],
];

// HTML만이 아니라 데모 CSS·JS도 절대 경로를 품을 수 있다(모듈 import가 대표적).
const SOURCES = ['index.html', 'progress.html', 'demo.css', 'demo.js'];
const used = new Set();

for (const name of SOURCES) {
  let text = await readFile(`demo/${name}`, 'utf8');

  for (const [from, to] of REWRITES) {
    if (text.includes(from)) used.add(from);
    text = text.replaceAll(from, to);
  }

  const leftovers = [
    ...text.matchAll(/(?:href|src)="(\/[^"]*)"|from '(\/[^']*)'|url\((\/[^)]*)\)/g),
  ].map((m) => m[1] ?? m[2] ?? m[3]);
  if (leftovers.length > 0) {
    throw new Error(`build-demo: ${name}에 절대 경로가 남았다 — ${[...new Set(leftovers)].join(', ')}`);
  }

  await writeFile(`${OUT}/${name}`, text);
}

// 어느 파일에서도 쓰이지 않은 치환 규칙은 경로가 바뀌었다는 신호다.
const unused = REWRITES.map(([from]) => from).filter((from) => !used.has(from));
if (unused.length > 0) {
  throw new Error(`build-demo: 쓰이지 않은 경로 규칙 — ${unused.join(', ')}. 데모에서 경로가 바뀌었나?`);
}

await writeFile(`${OUT}/.nojekyll`, '');

console.log(`built ${OUT}/ — ${SOURCES.join(', ')}, cards/, carousel.js, carousel.css, effects.css, basic.css, progress.css`);
