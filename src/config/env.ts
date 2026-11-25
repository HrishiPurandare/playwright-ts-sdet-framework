/**
 * Where the bank is. Defaults match `docker compose up` in novabank:
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
  /** Published password of the fictional seed customers (novabank backend/banking/seed.py). */
  password: process.env.NOVABANK_PASSWORD ?? 'NovaBank-Demo-2026',
} as const;
