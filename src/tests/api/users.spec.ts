import { expect, test } from '@playwright/test';

test.describe('Users API', () => {
  test('creates a user and returns it by id', async ({ request }) => {
    const created = await request.post('/api/users', { data: { name: 'API User' } });
    expect(created.status()).toBe(201);
    const user = await created.json();
    expect(user).toEqual({ id: expect.any(Number), name: 'API User' });

    const fetched = await request.get(`/api/users/${user.id}`);
    expect(fetched.status()).toBe(200);
    expect(await fetched.json()).toEqual(user);
  });

  test('rejects a user without a name', async ({ request }) => {
    const response = await request.post('/api/users', { data: {} });
    expect(response.status()).toBe(400);
  });

  test('returns 404 for an unknown user', async ({ request }) => {
    const response = await request.get('/api/users/999999');
    expect(response.status()).toBe(404);
  });
});
