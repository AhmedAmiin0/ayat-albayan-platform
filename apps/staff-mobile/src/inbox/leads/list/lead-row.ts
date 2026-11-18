import { t } from '@ab/mobile-kit';
import { leadAge } from '@/inbox/shared/format';
import { leadSourceWord } from '@/inbox/leads/detail/lead-words';
import type { LeadView } from '@ab/shared';

/**
 * «إعلان فيسبوك · منذ يومين · المسؤول: سارة»; the owner part only when the API sent a name. `now` (ms) is
 * the list's clock: the memoized row redraws when it moves, so the age never freezes.
 */
export function leadRowSubtitle(lead: LeadView, now = Date.now()): string {
  const base = `${leadSourceWord(lead.source)} · ${leadAge(lead.created_at, new Date(now))}`;
  return lead.assigned_to_name ? `${base} · ${t.mobileLeads.assignedTo.replace('{name}', lead.assigned_to_name)}` : base;
}
