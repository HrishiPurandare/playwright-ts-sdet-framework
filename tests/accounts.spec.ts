import { formatFils, parseShown, toFils } from '../src/data/money';
import { expect, test } from '../src/fixtures';

/*
 * Balance checks run as Lina: no test sends money from her accounts, so her balances can't change
 * while another worker is running a transfer test in parallel.
 */
test.describe('Accounts dashboard', () => {
  test.use({ customer: 'lina' });

  test('each account shows the balance the API holds, to the fils', async ({ accountsPage, api }) => {
    const accounts = await api.accounts();
    await accountsPage.open();

    await expect(accountsPage.accounts).toHaveCount(accounts.length);
    for (const account of accounts) {
      const row = accountsPage.account(account.id);
      await expect(row.balance).toHaveText(`${account.currency} ${formatFils(toFils(account.balance))}`);
      await expect(row.iban).toHaveText(account.iban_display);
    }
  });

  test('the total is the exact sum of the accounts', async ({ accountsPage, api }) => {
    const accounts = await api.accounts();
    const expected = accounts.reduce((sum, a) => sum + toFils(a.balance), 0n);
    await accountsPage.open();

    await expect(accountsPage.totalAmount).toBeVisible();
    // Compared as integers, not floats: an off-by-one-fils total must fail.
    expect(parseShown(await accountsPage.totalAmount.innerText())).toBe(expected);
  });

  test('a frozen account is marked, and only that one', async ({ accountsPage, api }) => {
    const accounts = await api.accounts();
    await accountsPage.open();

    for (const account of accounts) {
      const frozen = accountsPage.account(account.id).frozen;
      if (account.status === 'FROZEN') {
        await expect(frozen).toHaveText('Frozen');
      } else {
        await expect(frozen).toBeHidden();
      }
    }
    expect(accounts.filter((a) => a.status === 'FROZEN')).toHaveLength(1);
  });

  test('an account name opens its statement', async ({ accountsPage, statementPage, api, page }) => {
    const [account] = await api.accounts();
    await accountsPage.open();
    await accountsPage.account(account.id).name.click();

    await expect(page).toHaveURL(`/accounts/${account.id}`);
    await expect(statementPage.accountName).toHaveText(account.nickname);
    await expect(statementPage.balance).toHaveText(`AED ${formatFils(toFils(account.balance))}`);
  });
});

test.describe('A customer with one account', () => {
  test.use({ customer: 'omar' });

  test('sees just that account', async ({ accountsPage }) => {
    await accountsPage.open();
    await expect(accountsPage.accounts).toHaveCount(1);
  });

  test('the total says "1 account", not "1 accounts"', async ({ accountsPage }) => {
    // Known bug, found by this suite. test.fail() keeps the run green while the bug exists and
    // turns red the day it's fixed, as a reminder to remove this line.
    test.fail(true, 'ledgerly-bank: accounts.html always pluralises "accounts"');
    await accountsPage.open();
    const label = accountsPage.page.getByTestId('total-AED').locator('.muted');
    await expect(label).toContainText('Total balance'); // the page itself works...
    await expect(label).toHaveText('Total balance (1 account)', { timeout: 2_000 }); // ...the wording doesn't
  });
});
