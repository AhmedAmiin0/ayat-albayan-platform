import type { AdminTaskView, ReceivableRow } from '@ab/shared';
import { STUDENT } from '@/payments/fixtures';

// Test-only API answers for src/money/*.test.tsx (the packages and payments are payments/fixtures).

export function receivable(over: Partial<ReceivableRow> = {}): ReceivableRow {
  return {
    id: 'sub1',
    student: STUDENT,
    guardian: { name: 'أم هدى', phone_e164: '+966552147730' },
    price: 145,
    currency: 'SAR',
    starts_on: '2026-09-01',
    status: 'unpaid',
    paid: 45,
    owed: 100,
    days_overdue: 34,
    bucket: '31_60',
    ...over,
  };
}

export function receivablesView(rows: ReceivableRow[]) {
  return {
    rows,
    totals: [{ currency: 'SAR', owed: rows.reduce((n, r) => n + r.owed, 0), buckets: { '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 } }],
    total: rows.reduce((n, r) => n + r.owed, 0),
    currency: 'SAR',
    fx_missing: [] as string[],
  };
}

export function adminTask(over: Partial<AdminTaskView> = {}): AdminTaskView {
  return {
    id: 'task1',
    kind: 'renewal_due',
    subject_type: 'subscription',
    subject_id: 'sub1',
    student: STUDENT,
    title: null,
    due_at: null,
    done_at: null,
    created_at: '2026-09-30T08:00:00.000Z',
    ...over,
  };
}
