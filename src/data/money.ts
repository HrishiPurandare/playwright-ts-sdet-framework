/**
 * Money as integer fils (1/100 dirham) in a BigInt: "18240.15" -> 1824015n.
 * Never parseFloat a balance: 0.1 + 0.2 !== 0.3, and a test that rounds can hide the bug it hunts.
 */
export function toFils(amount: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!match) {
    throw new Error(`Not an amount: "${amount}"`);
  }
  const [, sign, whole, fraction = ''] = match;
  const fils = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return sign ? -fils : fils;
}

/** 1824015n -> "18,240.15", the way the app shows it (without the currency). */
export function formatFils(fils: bigint): string {
  const negative = fils < 0n;
  const abs = negative ? -fils : fils;
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** What the UI prints: "AED 18,240.15" (also accepts "-AED 1.00" style) -> fils. */
export function parseShown(text: string): bigint {
  const cleaned = text.replace(/[A-Z]{3}|,|\s/g, '');
  return toFils(cleaned);
}
