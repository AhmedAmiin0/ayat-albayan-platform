import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import type { KnownParts } from './known-number.types';

/** Who a number is when it has no message yet: enough for its people panel and its next lessons. */
export type KnownNumber = Pick<
  ThreadRow,
  'guardian_id' | 'guardian_name' | 'guardian_tz' | 'lead_id' | 'lead_status' | 'teacher_id'
>;

const NO_GUARDIAN = { guardian_id: null, guardian_name: null, guardian_tz: null };

const guardianFields = (g: KnownParts['guardian']) =>
  g ? { guardian_id: g.id, guardian_name: g.name, guardian_tz: g.tz } : NO_GUARDIAN;

const NO_LEAD = { lead_id: null, lead_status: null };

const leadFields = (l: KnownParts['lead']) =>
  l ? { lead_id: l.id, lead_status: l.status } : NO_LEAD;

const nobody = (p: KnownParts): boolean => !p.guardian && !p.lead && !p.teacher;

/** null = nobody we know (the composer still offers the templates without a lesson). */
export function knownOf(p: KnownParts): KnownNumber | null {
  if (nobody(p)) return null;
  const teacher_id = p.teacher?.id ?? null;
  return { ...guardianFields(p.guardian), ...leadFields(p.lead), teacher_id };
}
