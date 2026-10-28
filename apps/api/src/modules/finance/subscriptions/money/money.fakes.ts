// Test fixtures for the money modules (test-only, excluded from the build).
import { quote, type QuoteResponse } from '@ab/shared';
import type { ExpenseRow } from '../../expenses/expenses.queries';
import type { PaymentRow } from '../../payments/payments.queries';
import type { PayoutRow } from '../../payouts/payouts.queries';
import type { SubRow } from '../subscriptions.queries';

export const STUDENT_ID = '5a000000-0000-4000-8000-000000000001';
export const SUB_ID = '5b000000-0000-4000-8000-000000000001';
export const PAYMENT_ID = '5c000000-0000-4000-8000-000000000001';
export const PAYOUT_ID = '5d000000-0000-4000-8000-000000000001';
export const TEACHER_ID = '5e000000-0000-4000-8000-000000000001';
export const EXPENSE_ID = '5f000000-0000-4000-8000-000000000001';

/** The weekly package at the catalog price in Saudi Arabia (SAR 145, 4 × 90 min). */
export const WEEKLY_SA: QuoteResponse = {
  ...quote({ tier: 'weekly', duration: 45, country: 'SA', students: 1, discount: 0 }),
  fx: null,
};

export function subRow(patch: Partial<SubRow> = {}): SubRow {
  return {
    id: SUB_ID,
    student_id: STUDENT_ID,
    student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' },
    package: '4',
    duration: 90,
    lessons_total: 4,
    lessons_used_before: 0,
    price: 145,
    currency: 'SAR',
    fx_rate: null,
    fx_date: null,
    price_source: WEEKLY_SA as unknown as SubRow['price_source'],
    starts_on: '2026-09-25',
    status: 'unpaid',
    renews_on: null,
    notes: null,
    created_at: '2026-09-25T09:00:00Z',
    updated_at: '2026-09-25T09:00:00Z',
    created_by: null,
    client_request_id: null,
    ...patch,
  };
}

export function paymentRow(patch: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: PAYMENT_ID,
    subscription_id: SUB_ID,
    subscription: { student_id: STUDENT_ID, currency: 'SAR', student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' } },
    amount: 145,
    currency: 'SAR',
    method: 'bank',
    paid_at: '2026-10-01T09:00:00Z',
    receipt_path: null,
    client_request_id: null,
    recorded_by: 'a0000000-0000-4000-8000-000000000001',
    note: null,
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-01T09:00:00Z',
    kind: 'payment',
    original_amount: null,
    original_currency: null,
    fx_rate: null,
    invoice_id: null,
    ...patch,
  };
}

export function payoutRow(patch: Partial<PayoutRow> = {}): PayoutRow {
  return {
    id: PAYOUT_ID,
    teacher_id: TEACHER_ID,
    teacher: { id: TEACHER_ID, display_name_ar: 'أبرار', tz: 'Africa/Cairo' },
    month: '2026-09-01',
    lessons_count: 2,
    amount: 140,
    currency: 'EGP',
    status: 'draft',
    approved_at: null,
    approved_by: null,
    paid_at: null,
    paid_by: null,
    breakdown: { lines: [{ duration: 45, lessons: 2, rate: 70, amount: 140 }], lesson_ids: ['l1', 'l2'], statuses: ['completed'] },
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-01T09:00:00Z',
    created_by: null,
    method: null,
    note: null,
    receipt_path: null,
    ...patch,
  };
}

export function expenseRow(patch: Partial<ExpenseRow> = {}): ExpenseRow {
  return {
    id: EXPENSE_ID,
    month: '2026-09-01',
    category: 'ads',
    amount: 8000,
    currency: 'EGP',
    note: null,
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-01T09:00:00Z',
    created_by: null,
    paid_on: '2026-09-01',
    vendor: null,
    method: null,
    receipt_path: null,
    recurring: false,
    is_draft: false,
    template_id: null,
    ...patch,
  };
}
