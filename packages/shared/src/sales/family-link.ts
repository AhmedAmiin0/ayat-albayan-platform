import { z } from 'zod';
import type { ThreadView } from '../messaging/chat/views.js';

// «ربط بطالب موجود» (owner 2026-10-29): a lead chat's number becomes the SECOND number of an existing student's
// family (public.guardian_phones). POST /leads/:id/link-family { code } → 200 { linked }, behind leads.link_family.
// The answer never carries an id or a phone. Linking never makes anyone an owner of that family.

/** A generated student code (rule 7): AB- and at least four digits; a typed code is trimmed and upper-cased. */
export const leadFamilyLinkSchema = z.strictObject({
  code: z.string().trim().toUpperCase().regex(/^AB-\d{4,}$/),
});
export type LeadFamilyLink = z.output<typeof leadFamilyLinkSchema>;

/** true = the number was added now; false = it already was a number of that family (main or second). */
export type LeadFamilyLinked = { linked: boolean };

/** The error codes of POST /leads/:id/link-family (404: the first two; 409: the rest). */
export const LEAD_FAMILY_LINK_ERRORS = [
  'lead_not_found',
  'student_not_found',
  'number_taken',
  'family_has_second_number',
  'teacher_number',
  'lead_has_family',
] as const;
export type LeadFamilyLinkError = (typeof LEAD_FAMILY_LINK_ERRORS)[number];

/** A lead's chat with no family and no teacher, whatever the lead's status (converted and lost included). */
export function canLinkFamily(th: Pick<ThreadView, 'lead_id' | 'guardian_id' | 'teacher_id'>): boolean {
  return Boolean(th.lead_id) && !th.guardian_id && !th.teacher_id;
}

/** One number of a family: GET /guardians/:id `phones`, the student profile's `guardian.phones`. */
export type FamilyPhone = { phone_e164: string; is_primary: boolean };

/** The family's second number, or null (none, or an old API without `phones`). */
export function secondPhoneOf(phones?: readonly FamilyPhone[] | null): string | null {
  return phones?.find((p) => !p.is_primary)?.phone_e164 ?? null;
}
