import { z } from 'zod';

/** A generated student code (rule 7): AB- and four or more digits, trimmed and upper-cased. */
export const leadFamilyLinkSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^AB-\d{4,}$/),
});
export type LeadFamilyLink = z.output<typeof leadFamilyLinkSchema>;

/** true: the number was added now; false: it already was one of that family's numbers. */
export const leadFamilyLinkedSchema = z.strictObject({ linked: z.boolean() });
export type LeadFamilyLinked = z.infer<typeof leadFamilyLinkedSchema>;

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
export const leadFamilyLinkErrorSchema = z.enum(LEAD_FAMILY_LINK_ERRORS);
export type LeadFamilyLinkError = z.infer<typeof leadFamilyLinkErrorSchema>;
