import { PlaywrightTestConfig } from '@playwright/test';
const config: PlaywrightTestConfig = {
  testDir: 'src/tests',
  timeout: 60_000,
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } }
  ],
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]]
};
export default config;
