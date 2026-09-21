/**
 * README.md와 README_ko.md의 구조가 어긋나지 않았는지 본다.
 *
 * 산문까지 맞출 수는 없다. 대신 실제로 자주 일어나는 드리프트를 잡는다 —
 * 영어에만 섹션을 추가하고 번역을 빠뜨리거나, 한쪽 코드 예제만 고치는 경우.
 * 코드는 주석을 뺀 본문으로 비교한다. 주석은 번역 대상이다.
 */
import { readFile } from 'node:fs/promises';

const EN = 'README.md';
const KO = 'README_ko.md';

const sections = (text) =>
  text
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.trim());

const codeBlocks = (text) => [...text.matchAll(/```(\w*)\n(.*?)```/gs)].map((m) => [m[1], m[2]]);

const stripComments = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|\s)(\/\/|#)[^\n]*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const [en, ko] = await Promise.all([readFile(EN, 'utf8'), readFile(KO, 'utf8')]);
const problems = [];

const [se, sk] = [sections(en), sections(ko)];
if (se.length !== sk.length) {
  problems.push(`섹션 수가 다르다: ${EN} ${se.length}개 / ${KO} ${sk.length}개`);
}

const [ce, ck] = [codeBlocks(en), codeBlocks(ko)];
if (ce.length !== ck.length) {
  problems.push(`코드블록 수가 다르다: ${EN} ${ce.length}개 / ${KO} ${ck.length}개`);
} else {
  ce.forEach(([lang, code], i) => {
    const [koLang, koCode] = ck[i];
    if (lang !== koLang) {
      problems.push(`코드블록 ${i + 1}의 언어가 다르다: ${lang} / ${koLang}`);
    } else if (stripComments(code) !== stripComments(koCode)) {
      problems.push(`코드블록 ${i + 1}(${lang})의 본문이 다르다 — 주석을 뺀 코드는 같아야 한다`);
    }
  });
}

for (const [file, text] of [
  [EN, en],
  [KO, ko],
]) {
  const other = file === EN ? KO : EN;
  if (!text.includes(`href="${other}"`)) {
    problems.push(`${file} 상단에 ${other}로 가는 언어 링크가 없다`);
  }
}

if (problems.length > 0) {
  console.error('README 구조가 어긋났다:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`README 구조 일치: 섹션 ${se.length}개, 코드블록 ${ce.length}개`);
