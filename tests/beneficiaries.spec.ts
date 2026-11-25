import { otpFor } from '../src/api/mailpit';
import { CUSTOMERS } from '../src/data/customers';
import { asTyped, uniquePayee } from '../src/data/iban';
import { expect, test } from '../src/fixtures';

/* Omar adds beneficiaries here; Sara sends money in transfer.spec.ts. Separate customers, no clashes. */
test.use({ customer: 'omar' });

test.describe('Adding a beneficiary', () => {
  test('with the code from the real email, then pay them', async ({ beneficiariesPage, cleanupPayees, page }) => {
    const payee = uniquePayee('Noor Rahman');
    cleanupPayees.add(payee.name);
    await beneficiariesPage.open();

    // Typed the way people paste IBANs: lower case, with spaces. The app normalises it.
    await beneficiariesPage.add(payee.name, asTyped(payee.iban));
    const row = beneficiariesPage.row(payee.name);
    await expect(row.status).toHaveText('Waiting for code');
    await expect(beneficiariesPage.notice).toHaveText(`We emailed you a 6-digit code to confirm ${payee.name}.`);
    await expect(beneficiariesPage.otpPanel).toContainText(payee.name);

    await beneficiariesPage.enterCode(await otpFor(CUSTOMERS.omar.email, payee.name));
    await expect(row.status).toHaveText('Confirmed');
    await expect(beneficiariesPage.otpPanel).toBeHidden();

    await row.sendMoney.click();
    await expect(page).toHaveURL(/\/transfer\?beneficiary=\d+$/);
    await expect(page.getByRole('radio', { name: 'A beneficiary' })).toBeChecked();
    await expect(page.getByLabel('Beneficiary', { exact: true }).locator('option:checked')).toContainText(payee.name);
  });

  test('a wrong code says how many tries are left, and the right one still works', async ({ beneficiariesPage, cleanupPayees }) => {
    const payee = uniquePayee('Wrong Code');
    cleanupPayees.add(payee.name);
    await beneficiariesPage.open();
    await beneficiariesPage.add(payee.name, payee.iban);
    const code = await otpFor(CUSTOMERS.omar.email, payee.name);

    await beneficiariesPage.enterCode(code === '000000' ? '111111' : '000000');
    await expect(beneficiariesPage.otpError).toContainText('2 attempt');
    await expect(beneficiariesPage.row(payee.name).status).toHaveText('Waiting for code');

    await beneficiariesPage.enterCode(code);
    await expect(beneficiariesPage.row(payee.name).status).toHaveText('Confirmed');
  });

  test('a malformed IBAN is caught before anything is sent', async ({ beneficiariesPage, page }) => {
    const posts: string[] = [];
    page.on('request', (r) => r.method() === 'POST' && r.url().includes('/api/beneficiaries/') && posts.push(r.url()));
    await beneficiariesPage.open();
    await beneficiariesPage.add('Short Iban', 'AE07 0331 2345');

    await expect(beneficiariesPage.ibanError).toHaveText('A UAE IBAN is AE followed by 21 digits.');
    expect(posts).toEqual([]);
  });

  test('a wrong check digit gets past the browser but not the bank', async ({ beneficiariesPage }) => {
    // The browser only checks the shape; the server checks mod-97. Flip the check digits: still
    // AE + 21 digits, so only the server can catch it.
    const payee = uniquePayee('Bad Check');
    const broken = payee.iban.replace(/^AE(\d\d)/, (_, d: string) => `AE${String((Number(d) + 1) % 100).padStart(2, '0')}`);
    await beneficiariesPage.open();
    await beneficiariesPage.add(payee.name, broken);

    await expect(beneficiariesPage.addError).toBeVisible();
    await expect(beneficiariesPage.row(payee.name).root).toHaveCount(0);
  });

  test('the same IBAN twice is refused by the bank', async ({ beneficiariesPage, confirmedPayee }) => {
    await beneficiariesPage.open();
    await beneficiariesPage.add('Same Person Again', confirmedPayee.iban);

    await expect(beneficiariesPage.addError).toBeVisible();
    await expect(beneficiariesPage.rows.filter({ hasText: 'Same Person Again' })).toHaveCount(0);
  });
});

test.describe('Removing a beneficiary', () => {
  test('asks first, and "Keep" keeps them', async ({ beneficiariesPage, confirmedPayee, api }) => {
    await beneficiariesPage.open();
    const row = beneficiariesPage.row(confirmedPayee.name);

    await row.remove.click();
    await row.keep.click();
    await expect(row.status).toHaveText('Confirmed');

    await row.remove.click();
    await row.confirmRemove.click();
    await expect(beneficiariesPage.notice).toHaveText(`${confirmedPayee.name} was removed.`);
    await expect(row.root).toHaveCount(0);
    expect((await api.beneficiaries()).map((b) => b.id)).not.toContain(confirmedPayee.id);
  });
});
