import type { Page } from '@playwright/test';

import { env } from '../src/config/env';
import { CUSTOMERS } from '../src/data/customers';
import { expect, loggedOut, test } from '../src/fixtures';

/*
 * Tests tagged @real-login call the real login endpoint. The bank allows 10 logins a minute, so they
 * run in Chromium only (see playwright.config.ts); the login form has no browser-specific code.
 */
test.describe('Logging in', () => {
  test.use(loggedOut);

  test('a customer logs in and lands on their accounts', { tag: '@real-login' }, async ({ loginPage, shell, page }) => {
    await loginPage.open();
    await loginPage.login(CUSTOMERS.omar.email, env.password);

    await expect(page).toHaveURL(/\/accounts$/);
    await expect(shell.userName).toHaveText(CUSTOMERS.omar.name);
    await expect(page).toHaveTitle('Accounts · NovaBank');
  });

  test('a wrong password is refused and the form stays', { tag: '@real-login' }, async ({ loginPage, page }) => {
    await loginPage.open();
    await loginPage.login(CUSTOMERS.omar.email, 'not-the-password');

    await expect(loginPage.error).toBeVisible();
    await expect(loginPage.error).toHaveAttribute('role', 'alert'); // read out by screen readers
    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.password).toBeEditable();
  });

  test('a deep link survives the detour through the login page', { tag: '@real-login' }, async ({ loginPage, page, apiAs }) => {
    const [account] = await (await apiAs('omar')).accounts();
    await page.goto(`/accounts/${account.id}?direction=DEBIT`);

    await expect(page).toHaveURL(/\/login\?returnUrl=/);
    await loginPage.login(CUSTOMERS.omar.email, env.password);

    await expect(page).toHaveURL(`/accounts/${account.id}?direction=DEBIT`);
    await expect(page.getByLabel('Type')).toHaveValue('DEBIT');
  });

  test('returnUrl cannot send the customer to another site', { tag: '@real-login' }, async ({ loginPage, page }) => {
    await page.goto('/login?returnUrl=https://evil.example/phish');
    await loginPage.login(CUSTOMERS.omar.email, env.password);

    await expect(page).toHaveURL('/accounts');
    expect(new URL(page.url()).origin).toBe(env.baseUrl);
  });

  test('empty fields are explained without calling the server', async ({ loginPage, page }) => {
    const calls: string[] = [];
    page.on('request', (r) => r.url().includes('/api/auth/login/') && calls.push(r.url()));
    await loginPage.open();
    await loginPage.submit.click();

    await expect(loginPage.emailError).toHaveText('Enter your email.');
    await expect(loginPage.passwordError).toHaveText('Enter your password.');
    await loginPage.email.fill('not-an-email');
    await loginPage.submit.click();
    await expect(loginPage.emailError).toHaveText('Enter a valid email address.');
    expect(calls).toEqual([]);
  });

  test('a logged-out visitor is sent to the login page', async ({ page, loginPage }) => {
    await page.goto('/transfer');
    await expect(page).toHaveURL('/login?returnUrl=%2Ftransfer');
    await expect(loginPage.heading).toBeVisible();
  });
});

test.describe('Leaving', () => {
  test('logging out ends the session in this browser', async ({ page, shell, loginPage, accountsPage }) => {
    await accountsPage.open();
    await expect(accountsPage.heading).toBeVisible();

    await shell.logout();
    await expect(loginPage.heading).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('novabank.auth'))).toBeNull();

    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Faccounts/);
  });

  test('an expired session sends the customer to log in again', async ({ page, loginPage }) => {
    await expireSession(page);
    await page.goto('/beneficiaries');

    await expect(loginPage.sessionExpired).toBeVisible();
    await expect(page).toHaveURL(/\/login\?.*expired=1/);
    expect(await page.evaluate(() => localStorage.getItem('novabank.auth'))).toBeNull();
  });

  test('after an expired session, logging in returns to the page the customer was on', async ({ page }) => {
    // Bug found by this suite (kept as test.fail() until NovaBank 1.2.0 fixed it): the app's first
    // call (/api/auth/me/) can fail before the router has finished navigating, when router.url is
    // still "/". It failed about 15 runs in 16, so run this one with --repeat-each before trusting it.
    await expireSession(page);
    await page.goto('/beneficiaries');
    await expect(page.getByTestId('session-expired')).toBeVisible();
    await expect(page).toHaveURL(/returnUrl=%2Fbeneficiaries/);
  });
});

/**
 * Every API call answers 401, including the refresh. Mocked, so the real saved tokens are never
 * refreshed: refresh tokens rotate, and a real refresh here would invalidate the one all tests share.
 */
async function expireSession(page: Page): Promise<void> {
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 401, json: { detail: 'Token is invalid or expired' } }),
  );
}
