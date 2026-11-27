import type { ThreadView } from '../../messaging';
import type { FamilyPhone } from '../../people/students';

// A lead's number becomes the second number of an existing family; never makes anyone an owner.

/** A lead's chat with no family and no teacher, whatever the lead's status (converted, lost). */
export function canLinkFamily(
  th: Pick<ThreadView, 'lead_id' | 'guardian_id' | 'teacher_id'>,
): boolean {
  return Boolean(th.lead_id) && !th.guardian_id && !th.teacher_id;
}

/** The family's second number, or null (none, or an old API without `phones`). */
export function secondPhoneOf(phones?: readonly FamilyPhone[] | null): string | null {
  return phones?.find((p) => !p.is_primary)?.phone_e164 ?? null;
}
