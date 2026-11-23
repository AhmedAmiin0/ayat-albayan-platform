import type { ThreadView } from '@ab/shared';
import type { Href } from 'expo-router';

/** docs/16: only on a lead still in the funnel, never a family, teacher, converted or lost lead. */
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
