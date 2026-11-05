import config from '../../config/testConfig';
import { expect, test } from '../../fixtures';

test.describe('Login', () => {
  test('valid credentials open the users view', async ({ loginPage, page }) => {
    await loginPage.login(config.credentials.username, config.credentials.password);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(loginPage.error).toBeHidden();
  });

  test('wrong password shows an error and stays on the form', async ({ loginPage }) => {
    await loginPage.login(config.credentials.username, 'wrong-password');
    await expect(loginPage.error).toHaveText('Invalid username or password');
    await expect(loginPage.submit).toBeVisible();
  });
});
