import type { ThreadView } from '@ab/shared';
import { draftFromLead } from '@/features/teaching/booking/booking-entries';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';

// «تسجيل طالب جديد» in a sales chat (SalesRegisterAction): which threads offer it and its prefill.

/** A lead still in the funnel, not yet a family (the admin's «حجز حلقة تجريبية» rule in QuickActions). */
export const canRegisterFrom = (th: ThreadView): th is ThreadView & { lead_id: string } =>
  !!th.lead_id && !th.guardian_id && !th.teacher_id && th.lead_status !== 'converted' && th.lead_status !== 'lost';

/** What the thread already knows prefills step 1: the number, the WhatsApp name and the lead's source. */
export function draftFromThread(th: ThreadView & { lead_id: string }): BookingDraft {
  const name = th.lead_name ?? th.display_name ?? undefined;
  const draft = draftFromLead({ leadId: th.lead_id, phone: th.phone_e164, ...(name ? { name } : {}) }, null);
  if (!draft.newStudent || !th.lead_source) return draft;
  return { ...draft, newStudent: { ...draft.newStudent, source: th.lead_source } };
}
