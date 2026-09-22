// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// 라이브러리 런타임을 모든 문서 페이지에 싣는다. 저장소 루트의 TypeScript 소스를
// 그대로 가리키므로 빌드 단계 없이 소스 변경이 바로 반영된다.
const snapstripRuntime = {
  name: 'snapstrip-runtime',
  hooks: {
    'astro:config:setup'({ injectScript }) {
      const entry = new URL('../src/index.ts', import.meta.url).pathname;
      injectScript('page', `import ${JSON.stringify(entry)};`);
    },
  },
};

// GitHub Pages 프로젝트 사이트는 /<repo>/ 아래로 서빙된다.
export default defineConfig({
  site: 'https://chanungdev.github.io',
  base: '/snapstrip',
  trailingSlash: 'always',
  integrations: [
    snapstripRuntime,
    starlight({
      title: 'snapstrip',
      description: 'scroll-snap · ::scroll-button() · ::scroll-marker() 위에 만든 CSS 우선 carousel',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/chanungdev/snapstrip' },
      ],
      // 라이브러리 CSS를 문서 전체에 싣는다. 저장소 루트의 src/를 직접 가리키므로
      // 빌드 없이 소스 변경이 바로 반영된다.
      customCss: [
        '../src/carousel.css',
        '../src/effects.css',
        '../src/themes/basic.css',
        './src/styles/docs.css',
      ],
      sidebar: [
        { label: 'Overview', link: '/' },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
        { label: 'Samples', items: [{ autogenerate: { directory: 'samples' } }] },
        { label: 'Playground', link: '/playground/' },
      ],
    }),
  ],
});
