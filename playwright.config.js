import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:5173' },
  webServer: [
    // 라이브러리 테스트용 — src/를 그대로 서빙하고 .ts를 즉석 변환한다
    {
      command: 'node scripts/serve.js',
      url: 'http://localhost:5173/test/fixtures/basic.html',
      reuseExistingServer: true,
    },
    // 문서 사이트는 빌드 산출물로 검사한다. base 경로처럼 빌드에서만 드러나는
    // 문제가 과거에 배포를 깨뜨린 적이 있다.
    {
      command: 'pnpm --filter @snapstrip/site preview:test',
      url: 'http://localhost:4340/snapstrip/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
