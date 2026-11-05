import { z } from 'zod';
import { STUDENT_STATUSES } from '@ab/catalog';

// «العائلة» of «تفاصيل الطالب» (owner 2026-11-02): who the student's guardian is and the
// guardian's other students, so the staff open the family from the profile.

/** One brother or sister: the same guardian, another student. */
export const familySiblingSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string(),
  status: z.enum(STUDENT_STATUSES),
});

/**
 * GET /sales/students/:id `family`: the guardian's name (null for a viewer who cannot open the
 * chats, as the phone), whether the student is their own contact, and the siblings.
 */
export const salesStudentFamilySchema = z.object({
  guardian_name: z.string().nullable(),
  contact_is_self: z.boolean(),
  siblings: z.array(familySiblingSchema),
});

export type FamilySibling = z.infer<typeof familySiblingSchema>;
export type SalesStudentFamily = z.infer<typeof salesStudentFamilySchema>;

/** A missing or malformed `family` (an older API, an old cache) reads as no family block. */
export function parseSalesFamily(value: unknown): SalesStudentFamily | null {
  const parsed = salesStudentFamilySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
