import type { Tables } from '@ab/db';
import type { AssistantCommissionView } from '@ab/shared';
import { reasonText } from '../reasons';

export type CommissionRow = Tables<'assistant_commissions'> & {
  assistant: { id: string; full_name: string } | null;
  student: { id: string; code: string | null; name: string } | null;
};

export const COMMISSION_SELECT = '*, assistant:profiles!assistant_id(id, full_name), student:students!student_id(id, code, name)';

export function toCommissionView(row: CommissionRow): AssistantCommissionView {
  return {
    id: row.id,
    assistant: { id: row.assistant_id, name: row.assistant?.full_name ?? '' },
    student: { id: row.student_id, code: row.student?.code ?? '', name: row.student?.name ?? '' },
    subscription_id: row.subscription_id,
    type: row.commission_type,
    rate: Number(row.rate),
    base_amount: Number(row.base_amount),
    base_currency: row.base_currency,
    amount: Number(row.amount),
    currency: row.currency,
    earned_at: row.earned_at,
    status: row.status,
    void_reason: reasonText(row.void_reason),
    voided_at: row.voided_at,
    statement_id: row.statement_id,
  };
}
