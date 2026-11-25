import type { Account } from '../src/api/models';
import { toFils } from '../src/data/money';
import { expect, test } from '../src/fixtures';

/*
 * Sara sends AED 1.00 at a time between her own accounts. Own transfers don't count towards the
 * daily limit, so the suite can run any number of times a day. Each test checks its own transfer
 * by a unique remark, never the absolute balance: other workers move Sara's money in parallel.
 */
test.use({ customer: 'sara' });

let everyday: Account;
let rainyDay: Account;

test.beforeEach(async ({ api, customer }) => {
  if (customer !== 'sara') return; // the one-account test at the bottom runs as Omar
  const accounts = await api.accounts();
  everyday = accounts.find((a) => a.nickname === 'Everyday') as Account;
  rainyDay = accounts.find((a) => a.nickname === 'Rainy day') as Account;
  expect(everyday && rainyDay, "Sara's two seeded accounts").toBeTruthy();
});

function remark(label: string): string {
  return `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

test.describe('Sending money', () => {
  test('between own accounts: review, confirm, and exactly one debit and one credit', async ({ transferPage, api }) => {
    const remarks = remark('pw own');
    await transferPage.open();
    await transferPage.review({ from: 'Everyday', to: { account: 'Rainy day' }, amount: '1', remarks });

    await expect(transferPage.summaryFrom).toHaveText('Everyday');
    await expect(transferPage.summaryTo).toContainText('Rainy day');
    await expect(transferPage.summaryAmount).toHaveText('AED 1.00');
    await transferPage.confirm.click();

    await expect(transferPage.success).toContainText('Money sent');
    await expect(transferPage.successAmount).toHaveText('AED 1.00');
    await expect(transferPage.replayed).toBeHidden();

    const out = await api.transactions(everyday.id, { search: remarks });
    const into = await api.transactions(rainyDay.id, { search: remarks });
    expect(out.results.map((t) => [t.direction, t.amount])).toEqual([['DEBIT', '1.00']]);
    expect(into.results.map((t) => [t.direction, t.amount])).toEqual([['CREDIT', '1.00']]);
  });

  test('the statement shows the transfer the customer just made', async ({ transferPage, statementPage, page }) => {
    const remarks = remark('pw statement');
    await transferPage.open();
    await transferPage.review({ from: 'Everyday', to: { account: 'Rainy day' }, amount: '1.00', remarks });
    await transferPage.confirm.click();
    await expect(transferPage.success).toBeVisible();

    await page.getByTestId('transfer-view-statement').click();
    await expect(page).toHaveURL(`/accounts/${everyday.id}`);
    await statementPage.filter({ search: remarks });
    await expect(statementPage.rows).toHaveCount(1);
    await expect(statementPage.amounts).toHaveText(['-AED 1.00']);
  });

  test('a double click on Confirm sends one request', async ({ transferPage, page }) => {
    const posts: string[] = [];
    page.on('request', (r) => r.method() === 'POST' && r.url().endsWith('/api/transfers/') && posts.push(r.url()));
    await transferPage.open();
    await transferPage.review({ from: 'Everyday', to: { account: 'Rainy day' }, amount: '1.00', remarks: remark('pw dbl') });

    await transferPage.confirm.dblclick();
    await expect(transferPage.success).toBeVisible();
    expect(posts).toHaveLength(1);
  });

  test('Edit goes back to the form with everything still filled in', async ({ transferPage }) => {
    await transferPage.open();
    await transferPage.review({ from: 'Everyday', to: { account: 'Rainy day' }, amount: '12.50', remarks: 'kept' });
    await transferPage.edit.click();

    await expect(transferPage.amount).toHaveValue('12.50');
    await expect(transferPage.remarks).toHaveValue('kept');
  });
});

test.describe('When the network fails', () => {
  test('the money moved but the answer was lost: retry is safe and pays once', async ({ transferPage, page, api }) => {
    // The worst case for a bank app: the server did the transfer, the reply never arrived.
    // route.fetch() sends the request to the real bank; then the reply is thrown away.
    const keys: string[] = [];
    let dropped = false;
    await page.route('**/api/transfers/', async (route) => {
      keys.push((await route.request().headerValue('idempotency-key')) ?? '');
      if (!dropped) {
        dropped = true;
        await route.fetch(); // the bank really moves the money
        await route.abort('connectionreset'); // ...and the app never hears back
        return;
      }
      await route.continue();
    });
    const remarks = remark('pw lost reply');
    await transferPage.open();
    await transferPage.review({ from: 'Everyday', to: { account: 'Rainy day' }, amount: '1.00', remarks });
    await transferPage.confirm.click();

    await expect(transferPage.uncertain).toContainText("can't tell whether this transfer went through");
    await transferPage.retry.click();

    await expect(transferPage.success).toBeVisible();
    await expect(transferPage.replayed).toHaveText('This transfer had already gone through. You were not charged twice.');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1], 'the retry reuses the key').toBe(keys[0]);
    const debits = await api.transactions(everyday.id, { search: remarks });
    expect(debits.count, 'paid once, not twice').toBe(1);
  });

  test('a clear refusal goes back to the form, and the next attempt gets a new key', async ({ transferPage, page }) => {
    const keys: string[] = [];
    await page.route('**/api/transfers/', async (route) => {
      keys.push((await route.request().headerValue('idempotency-key')) ?? '');
      if (keys.length === 1) {
        await route.fulfill({
          status: 400,
          json: { code: 'insufficient_funds', detail: 'Not enough money in this account.' },
        });
        return;
      }
      await route.continue();
    });
    await transferPage.open();
    await transferPage.review({ from: 'Everyday', to: { account: 'Rainy day' }, amount: '1.00', remarks: remark('pw refused') });
    await transferPage.confirm.click();

    await expect(transferPage.error).toHaveAttribute('data-error-code', 'insufficient_funds');
    await expect(transferPage.form).toBeVisible();

    await transferPage.reviewButton.click();
    await transferPage.confirm.click();
    await expect(transferPage.success).toBeVisible();
    expect(keys[1], 'a new transfer, a new key').not.toBe(keys[0]);
  });
});

test.describe('Limits and checks', () => {
  test('more than AED 10,000 to a new beneficiary is refused by the bank', async ({ transferPage, confirmedPayee, api }) => {
    // With less money than that, the bank says insufficient_funds first and this test would pass or
    // fail for the wrong reason. So: the richest account, and a stated precondition.
    const accounts = await api.accounts();
    const richest = accounts.reduce((a, b) => (toFils(b.balance) > toFils(a.balance) ? b : a));
    expect(toFils(richest.balance), `precondition: ${richest.nickname} holds more than AED 10,000.01`).toBeGreaterThan(
      toFils('10000.01'),
    );
    await transferPage.open();
    await transferPage.review({ from: richest.nickname, to: { beneficiary: confirmedPayee.name }, amount: '10000.01' });
    await transferPage.confirm.click();

    await expect(transferPage.error).toHaveAttribute('data-error-code', 'new_beneficiary_limit');
    await expect(transferPage.error).toContainText('10,000.00');
    await expect(transferPage.form).toBeVisible();
    // Not a balance check: other workers move Sara's money at the same time. No debit to this payee.
    const paid = await api.transactions(richest.id, { search: confirmedPayee.name });
    expect(paid.count, 'nothing moved').toBe(0);
  });

  test('amounts the bank would reject never leave the browser', async ({ transferPage, page }) => {
    const posts: string[] = [];
    page.on('request', (r) => r.method() === 'POST' && r.url().endsWith('/api/transfers/') && posts.push(r.url()));
    await transferPage.open();

    for (const [amount, message] of [
      ['', 'Enter an amount.'],
      ['abc', 'Enter an amount like 250 or 250.50.'],
      ['1.234', 'Enter an amount like 250 or 250.50.'],
      ['0.00', 'The amount must be more than zero.'],
      ['999999999', 'That is more than the available balance.'],
    ]) {
      await transferPage.amount.fill(amount);
      await transferPage.reviewButton.click();
      await expect(transferPage.amountError, `amount "${amount}"`).toHaveText(message);
      await expect(transferPage.summary).toBeHidden();
    }
    expect(posts).toEqual([]);
  });
});

test.describe('A customer with one account', () => {
  test.use({ customer: 'omar' });

  test('is told there is no other account to send to', async ({ transferPage }) => {
    await transferPage.open();
    await transferPage.toOwn.check();
    await expect(transferPage.noOtherAccount).toHaveText('You have no other account to send to.');
  });
});
