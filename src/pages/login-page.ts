import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly sessionExpired: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Log in to NovaBank' });
    // Found by label, as a screen reader would: if the <label for> breaks, these tests fail.
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByTestId('login-submit');
    this.error = page.getByTestId('login-error');
    this.emailError = page.getByTestId('login-email-error');
    this.passwordError = page.getByTestId('login-password-error');
    this.sessionExpired = page.getByTestId('session-expired');
  }

  async open(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
