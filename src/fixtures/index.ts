import { test as base, expect } from '@playwright/test';

import { NovaBankApi } from '../api/novabank-api';
import { otpFor } from '../api/mailpit';
import type { Beneficiary } from '../api/models';
import { CUSTOMERS, CustomerKey, storageStatePath } from '../data/customers';
import { uniquePayee } from '../data/iban';
import { AccountsPage } from '../pages/accounts-page';
import { AppShell } from '../pages/app-shell';
import { BeneficiariesPage } from '../pages/beneficiaries-page';
import { LoginPage } from '../pages/login-page';
import { StatementPage } from '../pages/statement-page';
import { TransferPage } from '../pages/transfer-page';

interface Options {
  /** Who the test runs as: `test.use({ customer: 'omar' })`. Picks the saved login and the API token. */
  customer: CustomerKey;
}

interface Fixtures {
  api: NovaBankApi;
  /** The API as someone else, e.g. to find another customer's account id. */
  apiAs: (customer: CustomerKey) => Promise<NovaBankApi>;
  /** A beneficiary created and confirmed through the API (code read from Mailpit), removed afterwards. */
  confirmedPayee: Beneficiary;
  /** Names of beneficiaries a test adds through the UI; removed after the test, pass or fail. */
  cleanupPayees: Set<string>;
  shell: AppShell;
  loginPage: LoginPage;
  accountsPage: AccountsPage;
  statementPage: StatementPage;
  beneficiariesPage: BeneficiariesPage;
  transferPage: TransferPage;
}

export const test = base.extend<Options & Fixtures>({
  customer: ['sara', { option: true }],

  // Every page starts logged in as `customer`, from the login the setup project saved.
  storageState: async ({ customer }, use) => {
    await use(storageStatePath(customer));
  },

  api: async ({ customer }, use) => {
    const api = await NovaBankApi.as(customer);
    await use(api);
    await api.dispose();
  },

  apiAs: async ({}, use) => {
    const opened: NovaBankApi[] = [];
    await use(async (customer) => {
      const api = await NovaBankApi.as(customer);
      opened.push(api);
      return api;
    });
    await Promise.all(opened.map((api) => api.dispose()));
  },

  confirmedPayee: async ({ api, customer }, use) => {
    const { name, iban } = uniquePayee('API Payee');
    const created = await api.addBeneficiary(name, iban);
    const confirmed = await api.confirmBeneficiary(created.id, await otpFor(CUSTOMERS[customer].email, name));
    expect(confirmed.status).toBe('ACTIVE');
    await use(confirmed);
    await api.deleteBeneficiary(confirmed.id);
  },

  cleanupPayees: async ({ api }, use) => {
    const names = new Set<string>();
    await use(names);
    if (names.size === 0) return;
    for (const b of await api.beneficiaries()) {
      if (names.has(b.name)) await api.deleteBeneficiary(b.id);
    }
  },

  shell: async ({ page }, use) => use(new AppShell(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  accountsPage: async ({ page }, use) => use(new AccountsPage(page)),
  statementPage: async ({ page }, use) => use(new StatementPage(page)),
  beneficiariesPage: async ({ page }, use) => use(new BeneficiariesPage(page)),
  transferPage: async ({ page }, use) => use(new TransferPage(page)),
});

/** For tests that must start logged out (the login page itself). */
export const loggedOut = { storageState: { cookies: [], origins: [] } };

export { expect };
