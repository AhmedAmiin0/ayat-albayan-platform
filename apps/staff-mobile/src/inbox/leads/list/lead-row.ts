import { t } from '@ab/mobile-kit';
import { leadAge } from '@/inbox/shared/format';
import { leadSourceWord } from '@/inbox/leads/detail/lead-words';
import type { LeadView } from '@ab/shared';

/** Owner part only when the API sent a name; `now` in ms is the list clock so ages never freeze. */
export function leadRowSubtitle(lead: LeadView, now = Date.now()): string {
  const base = `${leadSourceWord(lead.source)} · ${leadAge(lead.created_at, new Date(now))}`;
  return lead.assigned_to_name ? `${base} · ${t.mobileLeads.assignedTo.replace('{name}', lead.assigned_to_name)}` : base;
}
