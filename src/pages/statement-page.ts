import { Locator, Page } from '@playwright/test';

export interface StatementFilters {
  direction?: '' | 'CREDIT' | 'DEBIT';
  category?: string;
  from?: string; // yyyy-mm-dd
  to?: string;
  search?: string;
}

export class StatementPage {
  readonly accountName: Locator;
  readonly balance: Locator;
  readonly notFound: Locator;
  readonly rows: Locator;
  readonly amounts: Locator;
  readonly count: Locator;
  readonly pageInfo: Locator;
  readonly next: Locator;
  readonly previous: Locator;
  readonly empty: Locator;
  readonly noSuchPage: Locator;
  readonly firstPage: Locator;
  readonly filterError: Locator;
  readonly direction: Locator;
  readonly category: Locator;
  readonly from: Locator;
  readonly to: Locator;
  readonly search: Locator;
  readonly apply: Locator;
  readonly clear: Locator;

  constructor(readonly page: Page) {
    this.accountName = page.getByTestId('statement-account-name');
    this.balance = page.getByTestId('statement-balance');
    this.notFound = page.getByTestId('statement-not-found').first();
    this.rows = page.locator('[data-test-role="transaction"]');
    this.amounts = this.rows.getByTestId('tx-amount');
    this.count = page.getByTestId('statement-count');
    this.pageInfo = page.getByTestId('page-info');
    this.next = page.getByTestId('page-next');
    this.previous = page.getByTestId('page-prev');
    this.empty = page.getByTestId('statement-empty');
    this.noSuchPage = page.getByTestId('statement-no-such-page');
    this.firstPage = page.getByTestId('first-page');
    this.filterError = page.getByTestId('filter-error');
    this.direction = page.getByLabel('Type');
    this.category = page.getByLabel('Category');
    this.from = page.getByLabel('From');
    this.to = page.getByLabel('To', { exact: true });
    this.search = page.getByLabel('Search');
    this.apply = page.getByTestId('filter-apply');
    this.clear = page.getByTestId('filter-clear');
  }

  async open(accountId: number, query = ''): Promise<void> {
    await this.page.goto(`/accounts/${accountId}${query}`);
  }

  async filter(filters: StatementFilters): Promise<void> {
    if (filters.direction !== undefined) await this.direction.selectOption(filters.direction);
    if (filters.category !== undefined) await this.category.selectOption(filters.category);
    if (filters.from !== undefined) await this.from.fill(filters.from);
    if (filters.to !== undefined) await this.to.fill(filters.to);
    if (filters.search !== undefined) await this.search.fill(filters.search);
    await this.apply.click();
  }

  /** The transaction row with this reference (rows are `data-testid="tx-<reference>"`). */
  row(reference: string): Locator {
    return this.page.getByTestId(`tx-${reference}`);
  }
}
