/**
 * The parts of the Ledgerly API the tests use (full contract: ledgerly-bank backend/openapi.yaml).
 * Money is a string like "1250.00", never a number: compare it with src/data/money.ts.
 */

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Account {
  id: number;
  iban: string;
  iban_display: string;
  type: 'CURRENT' | 'SAVINGS' | 'PREMIER';
  type_label: string;
  nickname: string;
  currency: string;
  balance: string;
  status: 'ACTIVE' | 'FROZEN';
}

export interface Transaction {
  id: number;
  reference: string;
  direction: 'CREDIT' | 'DEBIT';
  category: string;
  amount: string;
  balance_after: string;
  description: string;
  created_at: string;
}

export interface Beneficiary {
  id: number;
  name: string;
  iban: string;
  iban_display: string;
  status: 'PENDING' | 'ACTIVE' | 'LOCKED';
}

export interface Transfer {
  id: number;
  reference: string;
  uetr: string;
  kind: 'OWN' | 'INTERNAL' | 'LOCAL';
  status: 'COMPLETED' | 'PENDING';
  from_account: number;
  amount: string;
  remarks: string;
}
