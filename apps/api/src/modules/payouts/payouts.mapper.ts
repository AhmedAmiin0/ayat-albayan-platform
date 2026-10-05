import type { Json } from '@ab/db';
import type { LessonStatus, PayoutLine, PayoutView } from '@ab/shared';
import type { PayoutRow } from './payouts.queries';

type Breakdown = PayoutView['breakdown'];

const isRecord = (v: Json): v is { [key: string]: Json | undefined } =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const list = <T>(v: Json | undefined): T[] => (Array.isArray(v) ? (v as unknown as T[]) : []);

/** teacher_payouts.breakdown is written only by generate (payouts.plan); a hand edit reads empty. */
export function readBreakdown(v: Json): Breakdown {
  if (!isRecord(v)) return { lines: [], lesson_ids: [], statuses: [] };
  return {
    lines: list<PayoutLine>(v['lines']),
    lesson_ids: list<string>(v['lesson_ids']),
    statuses: list<LessonStatus>(v['statuses']),
  };
}

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
    breakdown: readBreakdown(row.breakdown),
    method: row.method,
    note: row.note,
    has_receipt: row.receipt_path !== null,
  };
}
