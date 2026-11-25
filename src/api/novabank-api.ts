import { readFileSync } from 'node:fs';

import { APIRequestContext, APIResponse, request } from '@playwright/test';

import { env } from '../config/env';
import { CustomerKey, storageStatePath } from '../data/customers';
import type { Account, Beneficiary, Page, Transaction, Transfer } from './models';

/** The key the Angular app keeps its tokens under (novabank frontend/src/app/core/auth.service.ts). */
export const AUTH_STORAGE_KEY = 'novabank.auth';

/**
 * Reads the access token out of a saved login instead of logging in again.
 * Why: the bank allows 10 logins a minute per client (AUTH_THROTTLE_RATE), and a suite that logs in
 * for every test hits it within seconds. One UI login per customer in the setup project, then reuse.
 */
export function accessTokenFor(customer: CustomerKey): string {
  const state = JSON.parse(readFileSync(storageStatePath(customer), 'utf8')) as {
    origins: { origin: string; localStorage: { name: string; value: string }[] }[];
  };
  const item = state.origins
    .flatMap((o) => o.localStorage)
    .find((entry) => entry.name === AUTH_STORAGE_KEY);
  if (!item) {
    throw new Error(`No saved login for ${customer}: run the "setup" project first`);
  }
  return (JSON.parse(item.value) as { access: string }).access;
}

/**
 * The bank's REST API, for test data: set up through the API (fast, exact), check through the UI
 * (what the customer sees). Never used to drive the step a UI test is about.
 */
export class NovaBankApi {
  private constructor(private readonly http: APIRequestContext) {}

  static async as(customer: CustomerKey): Promise<NovaBankApi> {
    const http = await request.newContext({
      baseURL: env.baseUrl,
      extraHTTPHeaders: { Authorization: `Bearer ${accessTokenFor(customer)}` },
    });
    return new NovaBankApi(http);
  }

  async dispose(): Promise<void> {
    await this.http.dispose();
  }

  async accounts(): Promise<Account[]> {
    return (await this.json<Page<Account>>(this.http.get('/api/accounts/'))).results;
  }

  async account(id: number): Promise<Account> {
    return this.json<Account>(this.http.get(`/api/accounts/${id}/`));
  }

  async transactions(accountId: number, params: Record<string, string> = {}): Promise<Page<Transaction>> {
    return this.json<Page<Transaction>>(
      this.http.get(`/api/accounts/${accountId}/transactions/`, { params }),
    );
  }

  async beneficiaries(): Promise<Beneficiary[]> {
    return (await this.json<Page<Beneficiary>>(this.http.get('/api/beneficiaries/'))).results;
  }

  /** Creates a PENDING beneficiary; the bank emails the code (read it with Mailpit). */
  async addBeneficiary(name: string, iban: string): Promise<Beneficiary> {
    return this.json<Beneficiary>(this.http.post('/api/beneficiaries/', { data: { name, iban } }));
  }

  async confirmBeneficiary(id: number, otp: string): Promise<Beneficiary> {
    return this.json<Beneficiary>(
      this.http.post(`/api/beneficiaries/${id}/confirm/`, { data: { otp } }),
    );
  }

  /** Cleanup. 404 is fine: the test may have removed it through the UI already. */
  async deleteBeneficiary(id: number): Promise<void> {
    const response = await this.http.delete(`/api/beneficiaries/${id}/`);
    if (![204, 404].includes(response.status())) {
      throw new Error(`DELETE beneficiary ${id}: HTTP ${response.status()} ${await response.text()}`);
    }
  }

  async transfer(body: Record<string, unknown>, idempotencyKey = crypto.randomUUID()): Promise<Transfer> {
    return this.json<Transfer>(
      this.http.post('/api/transfers/', {
        data: body,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    );
  }

  private async json<T>(pending: Promise<APIResponse>): Promise<T> {
    const response = await pending;
    if (!response.ok()) {
      throw new Error(`${response.url()}: HTTP ${response.status()} ${await response.text()}`);
    }
    return (await response.json()) as T;
  }
}
