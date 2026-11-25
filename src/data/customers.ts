/**
 * The seed customers, and why each one is here. In a bank the "roles" that matter for UI tests are
 * customer situations, not admin vs user: each persona unlocks screens the others never reach.
 */
export const CUSTOMERS = {
  /** Two active accounts: the happy path for statements and transfers between own accounts. */
  sara: { email: 'sara@example.com', name: 'Sara Khan', accounts: 2 },
  /** One account only: "You have no other account to send to." */
  omar: { email: 'omar@example.com', name: 'Omar Ali', accounts: 1 },
  /** Three accounts, one of them frozen: the Frozen badge, and frozen accounts can't send. */
  lina: { email: 'lina@example.com', name: 'Lina Haddad', accounts: 3 },
} as const;

export type CustomerKey = keyof typeof CUSTOMERS;

export const CUSTOMER_KEYS = Object.keys(CUSTOMERS) as CustomerKey[];

/** Saved login per customer, written by tests/auth.setup.ts. Gitignored: it holds real tokens. */
export function storageStatePath(customer: CustomerKey): string {
  return `.auth/${customer}.json`;
}
