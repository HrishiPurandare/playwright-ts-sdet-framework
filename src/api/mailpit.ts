import { expect, request } from '@playwright/test';

import { env } from '../config/env';

interface Summary {
  ID: string;
}

/**
 * Mailpit catches every email the bank sends (docker compose service `mail`).
 * Reading the one-time code from the real email tests the whole path: the bank made a code,
 * sent it over SMTP, and the code in the email is the one the bank accepts.
 */
export async function otpFor(to: string, beneficiaryName: string): Promise<string> {
  const mail = await request.newContext({ baseURL: env.mailpitUrl });
  const pattern = new RegExp(`Your code to add ${escapeRegExp(beneficiaryName)} is (\\d{6})`);
  let code: string | undefined;
  try {
    // expect.poll retries until the email shows up, instead of a fixed sleep.
    await expect
      .poll(
        async () => {
          const search = await mail.get('/api/v1/search', { params: { query: `to:${to}` } });
          const { messages } = (await search.json()) as { messages: Summary[] };
          for (const { ID } of messages ?? []) {
            const message = (await (await mail.get(`/api/v1/message/${ID}`)).json()) as { Text?: string };
            code = pattern.exec(message.Text ?? '')?.[1];
            if (code) return code;
          }
          return undefined;
        },
        { message: `code email for ${beneficiaryName} in Mailpit`, timeout: 10_000 },
      )
      .toMatch(/^\d{6}$/);
  } finally {
    await mail.dispose();
  }
  return code as string;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
