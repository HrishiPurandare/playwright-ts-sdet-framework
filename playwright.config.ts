import { defineConfig } from '@playwright/test';
import config from './src/config/testConfig';

export default defineConfig({
  testDir: 'src/tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: config.baseUrl,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'node demo-app/server.js',
        url: config.baseUrl,
        reuseExistingServer: !process.env.CI,
      },
});
