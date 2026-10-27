import type { Tables, TablesInsert } from '@ab/db';
import type { AssistantTermsInput, AssistantTermsView } from '@ab/shared';

export type TermsRow = Tables<'assistant_terms'>;

/** An assistant with no row yet has both parts null. `renewalShare`: settings.renewal_commission_percent. */
export function toTermsView(assistantId: string, row: TermsRow | null, renewalShare: number): AssistantTermsView {
  if (!row) return { assistant_id: assistantId, commission: null, salary: null, renewal_share_percent: renewalShare };
  const { commission_type: type, commission_starts_on: since, salary_currency: currency, salary_starts_on: from } = row;
  return {
    assistant_id: assistantId,
    commission: type && since ? { type, value: Number(row.commission_value), currency: row.commission_currency, starts_on: since } : null,
    salary: currency && from ? { amount: Number(row.salary_amount), currency, starts_on: from } : null,
    renewal_share_percent: renewalShare,
  };
}

/** The columns of a PUT: both parts are replaced, a null part clears its columns. */
export function termsColumns(assistantId: string, input: AssistantTermsInput, actorId: string): TablesInsert<'assistant_terms'> {
  return { assistant_id: assistantId, ...commissionColumns(input.commission), ...salaryColumns(input.salary), updated_by: actorId };
}

function commissionColumns(c: AssistantTermsInput['commission']) {
  return {
    commission_type: c?.type ?? null,
    commission_value: c?.value ?? null,
    commission_currency: c?.type === 'fixed' ? (c.currency ?? null) : null,
    commission_starts_on: c?.startsOn ?? null,
  };
}

function salaryColumns(s: AssistantTermsInput['salary']) {
  return { salary_amount: s?.amount ?? null, salary_currency: s?.currency ?? null, salary_starts_on: s?.startsOn ?? null };
}
