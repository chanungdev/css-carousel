import js from '@eslint/js';
import globals from 'globals';

/**
 * JavaScript만 다룬다 — scripts/ 와 test/, 그리고 설정 파일들.
 *
 * TypeScript(src/)와 .astro 컴포넌트는 빠져 있다. typescript-eslint가 TS 7을
 * 아직 지원하지 않고, .astro 파서도 그걸 거쳐 frontmatter를 읽기 때문이다.
 * 우회하려면 TypeScript 6을 나란히 설치해야 하는데 그 값은 못 한다 —
 * 린터가 TS에서 잡아줄 것(미사용 지역변수·인자, 빠진 return)은 tsconfig 플래그로
 * 켜 두었고, 타입은 pnpm typecheck가 strict로 본다.
 * typescript-eslint가 TS 7을 지원하면 여기에 되돌린다.
 */
export default [
  {
    ignores: ['dist/', 'site/dist/', 'site/.astro/', '_workspace/', 'node_modules/'],
  },

  js.configs.recommended,

  // 빌드·검사 스크립트와 설정 파일 — Node에서 돈다
  {
    files: ['scripts/**/*.js', '*.config.js', 'site/*.config.mjs'],
    languageOptions: { globals: globals.node },
  },

  // 테스트 — Playwright 러너는 Node, page.evaluate 안은 브라우저다.
  // 한 파일에 두 런타임이 섞이므로 globals도 둘 다 연다.
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  {
    rules: {
      // 쓰지 않는 인자는 _로 시작하면 의도한 것으로 본다
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
