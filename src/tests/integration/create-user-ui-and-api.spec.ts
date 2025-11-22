// src/tests/integration/create-user-ui-and-api.spec.ts
import { test, expect } from '@playwright/test';
import config from '../../config/testConfig';
import { apiPost, apiGet } from '../../utils/apiClient';

test.describe('API + Integration smoke', () => {
  test('create user via API and verify retrieval', async () => {
    const payload = { name: 'Auto Test User', email: 'auto.user@example.com' };
    const createResp = await apiPost('/users', payload);
    expect(createResp).toHaveProperty('id');
    expect(createResp.name).toBe(payload.name);
    const id = createResp.id;
    const getResp = await apiGet(`/users/${id}`);
    expect(getResp).toHaveProperty('id', id);
    expect(getResp).toHaveProperty('email', payload.email);
  });
});
