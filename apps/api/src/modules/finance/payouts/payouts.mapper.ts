import { payoutBreakdownSchema, type PayoutView } from '@ab/money';
import { parseStoredJson } from '@/common/db/stored-json';
import type { PayoutRow } from './payouts.repo';

const BREAKDOWN_AT = { table: 'teacher_payouts', column: 'breakdown' };

export function toPayoutView(row: PayoutRow): PayoutView {
  return {
    id: row.id,
    teacher: { id: row.teacher?.id ?? row.teacher_id, display_name_ar: row.teacher?.display_name_ar ?? '' },
    month: row.month.slice(0, 7),
    lessons_count: row.lessons_count,
    amount: Number(row.amount),
    currency: 'EGP',
    status: row.status,
    approved_at: row.approved_at,
    paid_at: row.paid_at,
    breakdown: parseStoredJson(payoutBreakdownSchema, row.breakdown, BREAKDOWN_AT),
    method: row.method,
    note: row.note,
    has_receipt: row.receipt_path !== null,
  };
}
