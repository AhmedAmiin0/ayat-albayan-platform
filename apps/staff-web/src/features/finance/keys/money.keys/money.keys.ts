import type { FinanceFileKeys, MoneyKeys, PricingKeys } from './money.keys.types';

const all = ['money'] as const;
const earnings = (owner: string) => [...all, 'teacher-earnings', owner];

// Every money write invalidates `all`, so each money read sits under it (balances, payments,
// packages and teacher earnings move together). `owner` is a teacher id, or 'me' for the
// teacher's own earnings.
export const moneyKeys: MoneyKeys = {
  all,
  expenses: (month) => [...all, 'expenses', month],
  expenseYear: (year) => [...all, 'expenses', 'year', year],
  expenseCategories: () => [...all, 'expense-categories'],
  receivables: () => [...all, 'receivables'],
  invoices: (q) => [...all, 'invoices', q],
  payments: ({ page, filters, sort }) => [...all, 'payments', page, filters, sort],
  receipt: (paymentId) => [...all, 'receipt', paymentId],
  payouts: (month) => [...all, 'payouts', month],
  myPayouts: () => [...all, 'payouts', 'mine'],
  earningsSummary: () => [...all, 'teacher-earnings', 'summary'],
  subscriptions: (q) => [...all, 'subscriptions', q],
  studentSubscriptions: (studentId) => [...all, 'subscriptions', 'student', studentId],
  balance: (studentId) => [...all, 'balance', studentId],
  tasks: () => [...all, 'tasks'],
  usedBefore: (subscriptionId) => [...all, 'used-before', subscriptionId],
  quote: (studentId, pricing) => [...all, 'quote', studentId, pricing],
  earnings,
  earningsBalance: (owner) => [...earnings(owner), 'balance'],
  earningsSessions: (owner, q) => [...earnings(owner), 'sessions', q],
  earningsPayments: (owner, q) => [...earnings(owner), 'payments', q],
};

// Signed links stay off the money root: a money write would sign them again while a receipt is
// open. They expire through their own staleTime.
export const financeFileKeys: FinanceFileKeys = {
  attachments: (path) => ['payment-attachments', path],
  teacherReceipt: (paymentId) => ['teacher-receipt', paymentId],
};

export const pricingKeys: PricingKeys = {
  quote: (search) => ['pricing', 'quote', search],
  catalog: (search) => ['pricing', 'catalog', search],
};
