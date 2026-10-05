// Test fixtures for the per-session ledger (test-only, excluded from the build).
import type { EarningRow, PaymentRow, SessionRow } from './earnings.queries';

export const TEACHER = '5e000000-0000-4000-8000-000000000001';
export const OTHER_TEACHER = '5e000000-0000-4000-8000-000000000002';
export const ACTOR = 'a0000000-0000-4000-8000-000000000001';
export const PAYMENT = '6c000000-0000-4000-8000-000000000001';
export const eid = (n: number) => `6e000000-0000-4000-8000-00000000000${n}`;
export const REQUEST = '6f000000-0000-4000-8000-000000000001';

export function earning(n: number, patch: Partial<EarningRow> = {}): EarningRow {
  return {
    id: eid(n),
    lesson_id: `7a000000-0000-4000-8000-00000000000${n}`,
    teacher_id: TEACHER,
    starts_at: `2026-09-0${n}T10:00:00Z`,
    minutes: 45,
    rate: 70,
    amount: 70,
    paid_amount: 0,
    currency: 'EGP',
    status: 'earned',
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
    ...patch,
  };
}

export const session = (n: number, patch: Partial<EarningRow> = {}): SessionRow => ({
  ...earning(n, patch),
  lesson: { lesson_students: [{ student: { name: 'سهيلة' } }, { student: null }] },
});

export function paymentRow(patch: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: PAYMENT,
    teacher_id: TEACHER,
    amount: 100,
    currency: 'EGP',
    paid_at: '2026-10-01T09:00:00Z',
    method: 'bank',
    receipt_path: null,
    note: null,
    client_request_id: null,
    payout_id: null,
    voided_at: null,
    voided_by: null,
    void_reason: null,
    created_by: ACTOR,
    created_at: '2026-10-01T09:00:00Z',
    items: [{ earning_id: eid(1) }, { earning_id: eid(2) }],
    ...patch,
  };
}
