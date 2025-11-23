// src/tests/integration/create-user-api.spec.ts
import { test, expect } from '@playwright/test';
import config from '../../config/testConfig';

// We'll use a public dummy API: https://reqres.in
// Make sure config.apiBase default is 'https://reqres.in/api'
test.describe('API integration via Playwright request', () => {
  test('create user via API returns id', async ({ request }) => {
    const payload = { name: 'Auto Test User', job: 'tester' };
    const response = await request.post(`${config.apiBase}/users`, {
      data: payload,
    });
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('name', payload.name);
  });
});
