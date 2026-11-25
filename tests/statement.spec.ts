import type { Account } from '../src/api/models';
import { parseShown, toFils } from '../src/data/money';
import { expect, test } from '../src/fixtures';

/* Lina's Premier account: hundreds of seeded transactions, and no test changes them. */
test.use({ customer: 'lina' });

let premier: Account;

test.beforeEach(async ({ api }) => {
  const accounts = await api.accounts();
  premier = accounts.find((a) => a.type === 'PREMIER') as Account;
  expect(premier, 'Lina has a Premier account in the seed').toBeDefined();
});

test.describe('Statement', () => {
  test('shows the account and the same number of transactions as the API', async ({ statementPage, api }) => {
    const { count } = await api.transactions(premier.id);
    await statementPage.open(premier.id);

    await expect(statementPage.accountName).toHaveText(premier.nickname);
    await expect(statementPage.count).toHaveText(`${count} transactions · Dubai time`);
    await expect(statementPage.rows).toHaveCount(20); // page size
  });

  test('every running balance follows from the row below it', async ({ statementPage }) => {
    // Newest first: balance(row) = balance(older row) + signed amount(row). One wrong sign,
    // a float rounding or a missing row anywhere on the page breaks the chain.
    await statementPage.open(premier.id);
    await expect(statementPage.rows).toHaveCount(20);
    const amounts = (await statementPage.amounts.allInnerTexts()).map(parseShown);
    const balances = (await statementPage.rows.getByTestId('tx-balance').allInnerTexts()).map(parseShown);

    for (let i = 0; i < amounts.length - 1; i++) {
      expect(balances[i], `row ${i + 1}`).toBe(balances[i + 1] + amounts[i]);
    }
    expect(balances[0], 'newest row ends at the account balance').toBe(toFils(premier.balance));
  });

  test('filters go into the URL, so reload and sharing keep them', async ({ statementPage, page, api }) => {
    const debits = await api.transactions(premier.id, { direction: 'DEBIT', category: 'CARD' });
    await statementPage.open(premier.id);
    await statementPage.filter({ direction: 'DEBIT', category: 'CARD' });

    await expect(page).toHaveURL(`/accounts/${premier.id}?direction=DEBIT&category=CARD`);
    await expect(statementPage.count).toHaveText(`${debits.count} transactions · Dubai time`);
    for (const amount of await statementPage.amounts.allInnerTexts()) {
      expect(amount).toMatch(/^-AED /);
    }

    await page.reload();
    await expect(statementPage.direction).toHaveValue('DEBIT');
    await expect(statementPage.category).toHaveValue('CARD');
    await expect(statementPage.count).toHaveText(`${debits.count} transactions · Dubai time`);
  });

  test('the next page keeps the filters', async ({ statementPage, page, api }) => {
    const { count } = await api.transactions(premier.id, { direction: 'DEBIT' });
    expect(count, 'precondition: more than one page of debits').toBeGreaterThan(20);
    await statementPage.open(premier.id, '?direction=DEBIT');
    await expect(statementPage.rows).toHaveCount(20);
    const firstRow = await statementPage.rows.first().getAttribute('data-testid');
    await statementPage.next.click();

    await expect(page).toHaveURL(`/accounts/${premier.id}?direction=DEBIT&page=2`);
    await expect(statementPage.pageInfo).toHaveText(`Page 2 of ${Math.ceil(count / 20)}`);
    await expect(statementPage.rows.first()).not.toHaveAttribute('data-testid', firstRow as string);
    for (const amount of await statementPage.amounts.allInnerTexts()) {
      expect(amount).toMatch(/^-AED /);
    }

    await statementPage.previous.click();
    await expect(page).toHaveURL(`/accounts/${premier.id}?direction=DEBIT`);
  });

  test('search finds a merchant, and no match says so', async ({ statementPage }) => {
    await statementPage.open(premier.id);
    await statementPage.filter({ search: 'Palm Grocers' });
    for (const text of await statementPage.rows.getByTestId('tx-description').allInnerTexts()) {
      expect(text).toContain('Palm Grocers');
    }

    await statementPage.filter({ search: 'no merchant has this name' });
    await expect(statementPage.empty).toHaveText('No transactions match these filters.');
    await statementPage.clear.click();
    await expect(statementPage.rows).toHaveCount(20);
  });

  test('a date range that ends before it starts is refused in the browser', async ({ statementPage, page }) => {
    let calls = 0;
    await statementPage.open(premier.id);
    await expect(statementPage.rows).toHaveCount(20);
    page.on('request', (r) => r.url().includes('/transactions/') && calls++);
    await statementPage.filter({ from: '2026-11-20', to: '2026-11-01' });

    await expect(statementPage.filterError).toBeVisible();
    await expect(page).toHaveURL(`/accounts/${premier.id}`);
    expect(calls).toBe(0);
  });

  test('a page past the end offers a way back', async ({ statementPage, page }) => {
    await statementPage.open(premier.id, '?page=999');
    await expect(statementPage.noSuchPage).toBeVisible();
    await statementPage.firstPage.click();
    await expect(page).toHaveURL(`/accounts/${premier.id}`);
    await expect(statementPage.rows).toHaveCount(20);
  });

  test("another customer's account looks exactly like one that doesn't exist", async ({ statementPage, apiAs }) => {
    // 404, not 403: a 403 would confirm the account exists (novabank returns 404 for both).
    const [omars] = await (await apiAs('omar')).accounts();
    await statementPage.open(omars.id);
    await expect(statementPage.notFound).toBeVisible();
    await expect(statementPage.accountName).toBeHidden();
    await expect(statementPage.page.getByText(omars.iban_display)).toBeHidden();

    await statementPage.open(99_999_999);
    await expect(statementPage.notFound).toBeVisible();
  });
});
