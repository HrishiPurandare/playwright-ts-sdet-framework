import config from '../../config/testConfig';
import { expect, test } from '../../fixtures';

test('user created through the API appears in the UI', async ({ request, loginPage }, testInfo) => {
  const name = `Hybrid User ${testInfo.project.name} ${Date.now()}`;
  const response = await request.post('/api/users', { data: { name } });
  expect(response.status()).toBe(201);

  await loginPage.login(config.credentials.username, config.credentials.password);
  await expect(loginPage.users.filter({ hasText: name })).toHaveCount(1);
});
