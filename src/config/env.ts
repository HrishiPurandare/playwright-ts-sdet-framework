/**
 * Where the bank is. Defaults match `docker compose up` in ledgerly-bank:
 * the app (and its API, behind nginx) on :8080, Mailpit's inbox on :8025.
 */
function url(name: string, fallback: string): string {
  const value = (process.env[name] ?? fallback).replace(/\/+$/, '');
  if (!/^https?:\/\//.test(value)) {
    throw new Error(`${name} must be an http(s) URL, got "${value}"`);
  }
  return value;
}

export const env = {
  baseUrl: url('BASE_URL', 'http://localhost:8080'),
  mailpitUrl: url('MAILPIT_URL', 'http://localhost:8025'),
  /** Published password of the fictional seed customers (ledgerly-bank backend/banking/seed.py). */
  password: process.env.LEDGERLY_PASSWORD ?? 'Ledgerly-Demo-2026',
} as const;
