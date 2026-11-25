import { expect, Locator, Page } from '@playwright/test';

export interface TransferForm {
  /** Option label prefix of the "From" account, e.g. "Everyday". */
  from?: string;
  /** Own account by name ("Rainy day"), or a beneficiary by name. */
  to: { account: string } | { beneficiary: string };
  amount: string;
  remarks?: string;
}

/** The send-money wizard: form → review → sending → done (or uncertain). */
export class TransferPage {
  readonly form: Locator;
  readonly from: Locator;
  readonly toOwn: Locator;
  readonly toBeneficiary: Locator;
  readonly toAccount: Locator;
  readonly beneficiary: Locator;
  readonly amount: Locator;
  readonly remarks: Locator;
  readonly amountError: Locator;
  readonly error: Locator;
  readonly noOtherAccount: Locator;
  readonly reviewButton: Locator;
  readonly summary: Locator;
  readonly summaryFrom: Locator;
  readonly summaryTo: Locator;
  readonly summaryAmount: Locator;
  readonly confirm: Locator;
  readonly edit: Locator;
  readonly uncertain: Locator;
  readonly retry: Locator;
  readonly success: Locator;
  readonly successAmount: Locator;
  readonly successName: Locator;
  readonly reference: Locator;
  readonly replayed: Locator;
  readonly sendAnother: Locator;

  constructor(readonly page: Page) {
    this.form = page.getByTestId('transfer-form');
    this.from = page.getByLabel('From');
    this.toOwn = page.getByRole('radio', { name: 'One of my accounts' });
    this.toBeneficiary = page.getByRole('radio', { name: 'A beneficiary' });
    this.toAccount = page.getByLabel('To account');
    this.beneficiary = page.getByLabel('Beneficiary', { exact: true }); // not the "A beneficiary" radio
    this.amount = page.getByLabel('Amount (AED)');
    this.remarks = page.getByLabel('Remarks (optional)');
    this.amountError = page.getByTestId('transfer-amount-error');
    this.error = page.getByTestId('transfer-error');
    this.noOtherAccount = page.getByTestId('no-own-accounts');
    this.reviewButton = page.getByTestId('transfer-review');
    this.summary = page.getByTestId('transfer-summary');
    this.summaryFrom = page.getByTestId('summary-from');
    this.summaryTo = page.getByTestId('summary-to');
    this.summaryAmount = page.getByTestId('summary-amount');
    this.confirm = page.getByTestId('transfer-confirm');
    this.edit = page.getByTestId('transfer-edit');
    this.uncertain = page.getByTestId('transfer-uncertain');
    this.retry = page.getByTestId('transfer-retry');
    this.success = page.getByTestId('transfer-success');
    this.successAmount = page.getByTestId('transfer-success-amount');
    this.successName = page.getByTestId('transfer-success-name');
    this.reference = page.getByTestId('transfer-reference');
    this.replayed = page.getByTestId('transfer-replayed');
    this.sendAnother = page.getByTestId('transfer-another');
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/transfer${query}`);
    await this.form.waitFor();
  }

  async fill(transfer: TransferForm): Promise<void> {
    if (transfer.from) await selectByLabelStart(this.from, transfer.from);
    if ('account' in transfer.to) {
      await this.toOwn.check();
      await selectByLabelStart(this.toAccount, transfer.to.account);
    } else {
      await this.toBeneficiary.check();
      await selectByLabelStart(this.beneficiary, transfer.to.beneficiary);
    }
    await this.amount.fill(transfer.amount);
    if (transfer.remarks !== undefined) await this.remarks.fill(transfer.remarks);
  }

  async review(transfer: TransferForm): Promise<void> {
    await this.fill(transfer);
    await this.reviewButton.click();
  }
}

/**
 * Options read "Everyday · AED 18,240.15": pick by the start, since the balance changes.
 * Waits for the option: the lists fill in after the page's API calls, and reading them straight
 * away found an empty <select> (first run of this suite).
 */
async function selectByLabelStart(select: Locator, start: string): Promise<void> {
  const option = select.locator('option').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(start)}`) });
  await expect(option, `option starting with "${start}"`).toHaveCount(1);
  await select.selectOption({ label: (await option.innerText()).trim() });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
