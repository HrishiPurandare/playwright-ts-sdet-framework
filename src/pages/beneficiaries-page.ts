import { Locator, Page } from '@playwright/test';

export class BeneficiariesPage {
  readonly heading: Locator;
  readonly notice: Locator;
  readonly rows: Locator;
  readonly addName: Locator;
  readonly addIban: Locator;
  readonly addNickname: Locator;
  readonly addSubmit: Locator;
  readonly addError: Locator;
  readonly ibanError: Locator;
  readonly otpPanel: Locator;
  readonly otpInput: Locator;
  readonly otpSubmit: Locator;
  readonly otpError: Locator;
  readonly otpFormatError: Locator;
  readonly otpLater: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Beneficiaries', level: 1 });
    this.notice = page.getByTestId('beneficiary-notice');
    this.rows = page.locator('[data-test-role="beneficiary"]');
    this.addName = page.getByLabel('Full name');
    this.addIban = page.getByLabel('IBAN');
    this.addNickname = page.getByLabel('Nickname (optional)');
    this.addSubmit = page.getByTestId('add-submit');
    this.addError = page.getByTestId('add-error');
    this.ibanError = page.getByTestId('add-iban-error');
    this.otpPanel = page.getByTestId('otp-panel');
    this.otpInput = page.getByTestId('otp-input');
    this.otpSubmit = page.getByTestId('otp-submit');
    this.otpError = page.getByTestId('otp-error');
    this.otpFormatError = page.getByTestId('otp-format-error');
    this.otpLater = page.getByTestId('otp-cancel');
  }

  async open(): Promise<void> {
    await this.page.goto('/beneficiaries');
  }

  async add(name: string, iban: string): Promise<void> {
    await this.addName.fill(name);
    await this.addIban.fill(iban);
    await this.addSubmit.click();
  }

  async enterCode(code: string): Promise<void> {
    await this.otpInput.fill(code);
    await this.otpSubmit.click();
  }

  /** A row by the beneficiary's name: names are unique per test run (see uniquePayee). */
  row(name: string): BeneficiaryRow {
    return new BeneficiaryRow(this.rows.filter({ has: this.page.getByText(name, { exact: true }) }));
  }
}

export class BeneficiaryRow {
  readonly status: Locator;
  readonly iban: Locator;
  readonly enterCode: Locator;
  readonly sendMoney: Locator;
  readonly remove: Locator;
  readonly confirmRemove: Locator;
  readonly keep: Locator;

  constructor(readonly root: Locator) {
    this.status = root.getByTestId('beneficiary-status');
    this.iban = root.getByTestId('beneficiary-iban');
    this.enterCode = root.getByTestId('beneficiary-enter-code');
    this.sendMoney = root.getByTestId('beneficiary-send');
    this.remove = root.getByTestId('beneficiary-delete');
    this.confirmRemove = root.getByTestId('beneficiary-delete-yes');
    this.keep = root.getByTestId('beneficiary-delete-no');
  }
}
