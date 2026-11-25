import { Locator, Page } from '@playwright/test';

export class AccountsPage {
  readonly heading: Locator;
  readonly accounts: Locator;
  readonly totalAmount: Locator;
  readonly error: Locator;
  readonly retry: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Your accounts' });
    this.accounts = page.locator('[data-test-role="account"]');
    this.totalAmount = page.getByTestId('total-AED').getByTestId('total-amount');
    this.error = page.getByTestId('accounts-error');
    this.retry = page.getByTestId('accounts-retry');
  }

  async open(): Promise<void> {
    await this.page.goto('/accounts');
  }

  /** One account row, by its API id (rows are `data-testid="account-<id>"`). */
  account(id: number): AccountRow {
    return new AccountRow(this.page.getByTestId(`account-${id}`));
  }
}

export class AccountRow {
  readonly name: Locator;
  readonly iban: Locator;
  readonly balance: Locator;
  readonly frozen: Locator;

  constructor(readonly root: Locator) {
    this.name = root.getByTestId('account-name');
    this.iban = root.getByTestId('account-iban');
    this.balance = root.getByTestId('account-balance');
    this.frozen = root.getByTestId('account-frozen');
  }
}
