import type { AssistantCommissionView, AssistantRow, AssistantStatementView } from './api';

export const ASSISTANT: AssistantRow = {
  id: 'a1',
  name: 'الزهراء',
  terms: {
    assistant_id: 'a1',
    commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-10-01' },
    salary: { amount: 3000, currency: 'EGP', starts_on: '2026-10-01' },
  },
};

export const COMMISSION: AssistantCommissionView = {
  id: 'c1',
  assistant: { id: 'a1', name: 'الزهراء' },
  student: { id: 's1', code: 'AB-1001', name: 'سهيلة' },
  subscription_id: 'sub1',
  type: 'percent',
  rate: 10,
  base_amount: 500,
  base_currency: 'SAR',
  amount: 50,
  currency: 'SAR',
  earned_at: '2026-10-03T10:00:00Z',
  status: 'earned',
  void_reason: null,
  voided_at: null,
  statement_id: null,
};

export const STATEMENT: AssistantStatementView = {
  id: 'st1',
  assistant: { id: 'a1', name: 'الزهراء' },
  month: '2026-10-01',
  status: 'draft',
  totals: {
    EGP: { salary: 3000, commissions: 0, adjustments: 0, total: 3000 },
    SAR: { salary: 0, commissions: 50, adjustments: -10, total: 40 },
  },
  lines: [
    { kind: 'salary', amount: 3000, currency: 'EGP', student: null, reason: null },
    { kind: 'commission', amount: 50, currency: 'SAR', student: { code: 'AB-1001', name: 'سهيلة' }, reason: null },
    { kind: 'adjustment', amount: -10, currency: 'SAR', student: null, reason: 'خصم تجريبي' },
  ],
  approved_at: null,
  paid_at: null,
  method: null,
  note: null,
  has_receipt: false,
};
