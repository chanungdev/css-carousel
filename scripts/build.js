import { build } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  outfile: 'dist/carousel.js',
});

// esbuild는 타입을 지우기만 하고 검사하지 않는다. 선언 파일은 tsc가 만들고,
// 그 과정이 곧 타입 검사라 잘못된 타입이 배포로 새어 나가지 않는다.
execFileSync('npx', ['tsc', '--project', 'tsconfig.json'], { stdio: 'inherit' });

await copyFile('src/carousel.css', 'dist/carousel.css');
await copyFile('src/effects.css', 'dist/effects.css');
await mkdir('dist/themes', { recursive: true });
await copyFile('src/themes/basic.css', 'dist/themes/basic.css');
await copyFile('src/themes/progress.css', 'dist/themes/progress.css');

console.log(
  'built dist/carousel.js, dist/*.d.ts, dist/carousel.css, dist/effects.css, dist/themes/basic.css, dist/themes/progress.css',
);
