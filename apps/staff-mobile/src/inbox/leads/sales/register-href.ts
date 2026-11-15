import type { ThreadView } from '@ab/shared';
import type { Href } from 'expo-router';

/**
 * A salesperson's «تسجيل طالب جديد» from a chat (docs/16, the web's SalesRegisterAction): only on a
 * lead still in the funnel (not a family, a teacher, a converted or a lost lead). It opens the trial
 * wizard in sales mode with what the thread knows: the lead, the number, the WhatsApp name, the source.
 */
export function registerHref(th: ThreadView | null): Href | null {
  if (!th?.lead_id || th.guardian_id || th.teacher_id) return null;
  if (th.lead_status === 'converted' || th.lead_status === 'lost') return null;
  const name = th.lead_name ?? th.display_name;
  const params = {
    leadId: th.lead_id,
    phone: th.phone_e164,
    mode: 'register',
    ...(name ? { name } : {}),
    ...(th.lead_source ? { source: th.lead_source } : {}),
  };
  return { pathname: '/inbox/book', params };
}
