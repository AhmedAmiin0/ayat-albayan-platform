export type QueryKeyParts = readonly unknown[];

type One<A> = (a: A) => QueryKeyParts;
type Two<A, B> = (a: A, b: B) => QueryKeyParts;

export interface MoneyKeys {
  all: readonly ['money'];
  expenses: One<string>;
  expenseYear: One<string>;
  expenseCategories: () => QueryKeyParts;
  receivables: () => QueryKeyParts;
  invoices: One<unknown>;
  payments: One<{ page: number; filters: unknown; sort: unknown }>;
  receipt: One<string>;
  payouts: One<string>;
  earningsSummary: () => QueryKeyParts;
  subscriptions: One<unknown>;
  studentSubscriptions: One<string>;
  balance: One<string>;
  tasks: () => QueryKeyParts;
  usedBefore: One<string>;
  quote: Two<string, unknown>;
  earnings: One<string>;
  earningsBalance: One<string>;
  earningsSessions: Two<string, unknown>;
  earningsPayments: Two<string, unknown>;
}

export interface FinanceFileKeys {
  attachments: One<string>;
  teacherReceipt: One<string>;
}

export interface PricingKeys {
  quote: One<string>;
  catalog: One<string>;
}
