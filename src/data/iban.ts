/**
 * A valid UAE IBAN: AE + 2 check digits + 3-digit bank code + 16-digit account number.
 * Check digits per ISO 13616 (mod 97, letters A=10 … Z=35, so "AE00" becomes "101400").
 */
export function uaeIban(bankCode: string, accountNumber: string): string {
  if (!/^\d{3}$/.test(bankCode) || !/^\d{16}$/.test(accountNumber)) {
    throw new Error('bank code is 3 digits, account number 16');
  }
  const bban = bankCode + accountNumber;
  const check = 98n - (BigInt(bban + '101400') % 97n);
  return `AE${check.toString().padStart(2, '0')}${bban}`;
}

/** "AE070331234567890123456" -> "ae07 0331 2345 6789 0123 456": how a person might paste it. */
export function asTyped(iban: string): string {
  return iban.toLowerCase().replace(/(.{4})/g, '$1 ').trim();
}

/** Bank 033 is "another UAE bank" in NovaBank, so transfers to it are LOCAL and make a pacs.008. */
export const OTHER_BANK = '033';

let counter = 0;

/** A unique name and IBAN per call, so parallel workers and repeated runs never collide. */
export function uniquePayee(label: string): { name: string; iban: string } {
  counter += 1;
  const stamp = `${Date.now()}${process.pid % 1000}${counter}`.slice(-16).padStart(16, '0');
  return { name: `${label} ${stamp.slice(-9)}`, iban: uaeIban(OTHER_BANK, stamp) };
}
