import { Locator, Page } from '@playwright/test';

/** The top bar on every page: brand, main navigation, who is logged in, log out. */
export class AppShell {
  readonly nav: Locator;
  readonly accountsLink: Locator;
  readonly transferLink: Locator;
  readonly beneficiariesLink: Locator;
  readonly userName: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Main' });
    this.accountsLink = page.getByTestId('nav-accounts');
    this.transferLink = page.getByTestId('nav-transfer');
    this.beneficiariesLink = page.getByTestId('nav-beneficiaries');
    this.userName = page.getByTestId('user-name');
    this.logoutButton = page.getByTestId('logout');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
