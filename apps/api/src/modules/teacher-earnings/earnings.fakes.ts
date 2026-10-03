// Test fixtures for the per-session ledger (test-only, excluded from the build).
import type { EarningRow, PaymentRow } from './teacher-earnings.queries';

export const T1 = '5e000000-0000-4000-8000-000000000001';
export const T2 = '5e000000-0000-4000-8000-000000000002';
export const REQ = '7a000000-0000-4000-8000-000000000001';
export const PAYMENT = '7b000000-0000-4000-8000-000000000001';
export const E = (n: number) => `7c000000-0000-4000-8000-00000000000${n}`;

/** One earning of 90 EGP (60 min); `day` = the September 2026 day of the session. */
export function earning(n: number, day: number, patch: Partial<EarningRow> = {}): EarningRow {
  return {
    id: E(n),
    lesson_id: `7d000000-0000-4000-8000-00000000000${n}`,
    teacher_id: T1,
    starts_at: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z`,
    minutes: 60,
    rate: 90,
    amount: 90,
    paid: 0,
    outstanding: 90,
    currency: 'EGP',
    status: 'earned',
    created_at: '2026-09-01T00:00:00Z',
    ...patch,
  };
}

export function paymentRow(patch: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: PAYMENT,
    teacher_id: T1,
    amount: 150,
    currency: 'EGP',
    paid_at: '2026-09-20T10:00:00Z',
    method: 'bank',
    receipt_path: null,
    note: null,
    client_request_id: REQ,
    payout_id: null,
    created_by: null,
    created_at: '2026-09-20T10:00:00Z',
    items: [{ id: 'i1' }, { id: 'i2' }],
    ...patch,
  };
}
