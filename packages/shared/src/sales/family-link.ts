import { z } from 'zod';
import type { ThreadView } from '../messaging/index.js';
import type { FamilyPhone } from '../people/students/index.js';

// A lead's number becomes the second number of an existing family; never makes anyone an owner.

/** A generated student code (rule 7): AB- and at least four digits; a typed code is trimmed and upper-cased. */
export const leadFamilyLinkSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^AB-\d{4,}$/),
});
export type LeadFamilyLink = z.output<typeof leadFamilyLinkSchema>;

/** true = the number was added now; false = it already was a number of that family (main or second). */
export type LeadFamilyLinked = { linked: boolean };

/**
 * The error codes of POST /leads/:id/link-family (404: the first two; 409: the rest).
 * guardian_has_login: a non-admin, once the family has a login (a second number signs in to it).
 */
export const LEAD_FAMILY_LINK_ERRORS = [
  'lead_not_found',
  'student_not_found',
  'number_taken',
  'family_has_second_number',
  'teacher_number',
  'lead_has_family',
  'guardian_has_login',
] as const;
export type LeadFamilyLinkError = (typeof LEAD_FAMILY_LINK_ERRORS)[number];

/** A lead's chat with no family and no teacher, whatever the lead's status (converted and lost included). */
export function canLinkFamily(
  th: Pick<ThreadView, 'lead_id' | 'guardian_id' | 'teacher_id'>,
): boolean {
  return Boolean(th.lead_id) && !th.guardian_id && !th.teacher_id;
}

/** The family's second number, or null (none, or an old API without `phones`). */
export function secondPhoneOf(phones?: readonly FamilyPhone[] | null): string | null {
  return phones?.find((p) => !p.is_primary)?.phone_e164 ?? null;
}
