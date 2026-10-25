import { t } from '@/core/lib/i18n/i18n';
import { leadAge } from '../shared/format';
import { leadSourceWord } from '../lead-words';
import type { Lead } from '../shared/types';

/** «إعلان فيسبوك · منذ يومين · المسؤول: سارة»; the owner part only when the API sent a name. */
export function leadRowSubtitle(lead: Lead): string {
  const base = `${leadSourceWord(lead.source)} · ${leadAge(lead.created_at)}`;
  return lead.assigned_to_name ? `${base} · ${t.mobileLeads.assignedTo.replace('{name}', lead.assigned_to_name)}` : base;
}
