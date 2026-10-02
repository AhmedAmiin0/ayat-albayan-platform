import ar from '@ab/shared/i18n/ar.json';
import { describe, expect, it } from 'vitest';

// Rule 10 + docs/11 §3: every code the money routes return has an Arabic line in its feature's
// `error` table, so the web and mobile apps show it by `code` (or by the zod issue message).
const CODES: Record<string, { table: Record<string, string>; codes: string[] }> = {
  subscriptions: {
    table: ar.subscriptions.error,
    codes: ['student_not_found', 'subscription_not_found', 'has_payments', 'fx_unavailable', 'task_not_found'],
  },
  payments: {
    table: ar.payments.error,
    codes: [
      'currency_mismatch',
      'paid_at_future',
      'receipt_type',
      'receipt_too_large',
      'receipt_path',
      'subscription_not_found',
      'payment_not_found',
      'receipt_not_found',
    ],
  },
  payouts: {
    table: ar.payouts.error,
    codes: ['invalid_transition', 'payout_not_found', 'invalid_month', 'rate_missing', 'month_not_over', 'reports_pending'],
  },
  expenses: { table: ar.expenses.error, codes: ['expense_not_found'] },
};

describe('money error codes have Arabic messages (rule 10)', () => {
  it.each(Object.entries(CODES))('%s', (_feature, { table, codes }) => {
    for (const code of codes) expect(table[code], code).toMatch(/\p{Script=Arabic}/u);
  });
});
