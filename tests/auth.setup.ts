import { expect, test as setup } from '@playwright/test';

import { env } from '../src/config/env';
import { CUSTOMERS, CUSTOMER_KEYS, storageStatePath } from '../src/data/customers';
import { LoginPage } from '../src/pages/login-page';

/**
 * Logs each customer in once, through the real login page, and saves the result (localStorage
 * tokens) for every other test to start from. 3 logins per run instead of one per test: faster,
 * and well inside the bank's 10-logins-a-minute limit.
 */
for (const key of CUSTOMER_KEYS) {
  setup(`log in as ${key}`, async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.login(CUSTOMERS[key].email, env.password);

    await expect(page).toHaveURL(/\/accounts$/);
    await expect(page.getByTestId('user-name')).toHaveText(CUSTOMERS[key].name);
    await page.context().storageState({ path: storageStatePath(key) });
  });
}
