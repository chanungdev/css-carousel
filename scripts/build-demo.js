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
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

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

// 데모가 참조하는 경로를 빌드 산출물로 옮긴다. 치환이 하나라도 빗나가면
// 배포본이 조용히 깨지므로, 기대한 만큼 바뀌었는지 확인한다.
const REWRITES = [
  ['/src/carousel.css', './carousel.css'],
  ['/src/effects.css', './effects.css'],
  ['/src/themes/basic.css', './basic.css'],
  ['/src/index.js', './carousel.js'],
];

let html = await readFile('demo/index.html', 'utf8');
for (const [from, to] of REWRITES) {
  const count = html.split(from).length - 1;
  if (count === 0) throw new Error(`build-demo: 데모에서 ${from}를 찾지 못했다 — 경로가 바뀌었나?`);
  html = html.replaceAll(from, to);
}

const leftovers = [...html.matchAll(/(?:href|src)="(\/[^"]*)"|from '(\/[^']*)'/g)].map(
  (m) => m[1] ?? m[2],
);
if (leftovers.length > 0) {
  throw new Error(`build-demo: 절대 경로가 남았다 — ${[...new Set(leftovers)].join(', ')}`);
}

await writeFile(`${OUT}/index.html`, html);

// GitHub Pages는 _로 시작하는 경로를 Jekyll로 처리하려 든다. 정적 파일만 올린다고 알린다.
await writeFile(`${OUT}/.nojekyll`, '');

console.log(`built ${OUT}/ — index.html, carousel.js, carousel.css, effects.css, basic.css`);
