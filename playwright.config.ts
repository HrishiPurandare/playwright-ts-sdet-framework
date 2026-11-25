import { defineConfig, devices } from '@playwright/test';

import { env } from './src/config/env';

/**
 * Runs against a running NovaBank (docker compose up in novabank). The tests don't start
 * the bank themselves: the same suite can then point at a laptop, CI or a shared test environment.
 */
export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry in CI, and a retry that passes is reported as "flaky", not hidden.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.baseUrl,
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timezoneId: 'Asia/Dubai', // the bank's customers' time, whatever the CI machine's clock says
    locale: 'en-AE',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
      // Real logins run once (Chromium): the bank allows 10 a minute, and the form isn't browser-specific.
      grepInvert: /@real-login/,
    },
  ],
});
