import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

await build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  outfile: 'dist/carousel.js',
});

await copyFile('src/carousel.css', 'dist/carousel.css');
await copyFile('src/effects.css', 'dist/effects.css');

console.log('built dist/carousel.js, dist/carousel.css, dist/effects.css');
