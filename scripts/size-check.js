import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const BUDGET = 8192;

const bundle = await readFile('dist/carousel.js');
const size = gzipSync(bundle).length;

console.log(`dist/carousel.js: ${size} bytes gzip (budget ${BUDGET})`);

if (size > BUDGET) {
  console.error(`크기 예산 초과: ${size - BUDGET} bytes`);
  process.exit(1);
}
