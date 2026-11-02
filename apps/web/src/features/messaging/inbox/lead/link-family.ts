import type { LeadFamilyLinked } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { apiErrorText } from '@/features/finance/subscriptions';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { SALES_MONEY_KEY } from '@/features/sales/sales-money';

// «ربط بطالب موجود» (owner 2026-10-29): POST /leads/:id/link-family { code } → { linked }, leads.link_family.

export const linkFamily = ({ leadId, code }: { leadId: string; code: string }) =>
  apiSend<LeadFamilyLinked>('POST', `/leads/${leadId}/link-family`, { code });

/** The 404 / 409 codes in Arabic; a 400, a 403 or anything else is the generic error. */
export const linkFamilyErrorText = (e: unknown): string => apiErrorText(e, { ...t.inbox.linkFamily.errors });

/** The search (GET /sales/registration-check) refused: its own texts, «تعذّر التحقق» for the rest. */
export function searchErrorText(e: unknown): string {
  const text = apiErrorText(e, { ...t.registrationCheck.error });
  return text === t.common.error ? t.registrationCheck.error.generic : text;
}

/** «رُبط الرقم…» for a number added now, «مرتبط… من قبل» when it already was this family's. */
export const linkedText = (r: LeadFamilyLinked): string => (r.linked ? t.inbox.linkFamily.done : t.inbox.linkFamily.already);

/** The chat now shows the family (v_threads), the lead is converted, and the family's money reads change. */
export async function refreshAfterLink(client: QueryClient): Promise<void> {
  for (const queryKey of [['threads'], ['leads'], SALES_MONEY_KEY]) await client.invalidateQueries({ queryKey });
}
