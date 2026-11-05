import { z } from 'zod';
import { guardianCreateSchema, studentCreateSchema } from './people.js';

// «تعديل البيانات» by an assistant (owner 2026-11-02): the admin's PATCH fields minus the
// admin-only ones, under people.edit, never students.write / guardians.write (those also delete and
// merge). Strict: an admin-only field answers 400, it is never silently dropped.

/**
 * The student fields an assistant edits. Admin-only (PATCH /students/:id): status and
 * expected_status (automatic moves), program (pricing), teacher_id (assignment) and
 * meeting_link_override. guardian_id and contact_is_self have their own audited actions below. No
 * `.default()` here: a partial body never resets a field it does not name.
 */
export const peopleStudentPatchSchema = studentCreateSchema
  .pick({
    name: true,
    age: true,
    gender: true,
    level: true,
    memorized: true,
    goal: true,
    riwaya: true,
    tz: true,
    notes: true,
    teacher_gender_pref: true,
  })
  .partial()
  .strict();
export type PeopleStudentPatch = z.output<typeof peopleStudentPatchSchema>;

/** The family fields an assistant edits; `source` (marketing attribution) stays the admin's. */
export const peopleGuardianPatchSchema = guardianCreateSchema
  .pick({ name: true, phone_e164: true, country: true, tz: true, notes: true })
  .partial()
  .strict();
export type PeopleGuardianPatch = z.output<typeof peopleGuardianPatchSchema>;

/**
 * Notes stay the admin's (owner 2026-10-27, «never notes» for sales): a student or family PATCH
 * from any other role is also parsed by this, so a `notes` key answers 400.
 */
export const notesFreeSchema = z.object({ notes: z.undefined() });

/** A new family for «ربط بولي أمر آخر»: found by its main phone first, created only when new. */
export const newFamilySchema = guardianCreateSchema.pick({
  name: true,
  phone_e164: true,
  tz: true,
  country: true,
});

/** «ربط بولي أمر آخر»: exactly one of an existing family or a new one, tagged by `kind`. */
export const familyMoveSchema = z.union([
  z
    .strictObject({ guardian_id: z.guid() })
    .transform((v) => ({ kind: 'existing' as const, id: v.guardian_id })),
  z
    .strictObject({ guardian: newFamilySchema })
    .transform((v) => ({ kind: 'new' as const, guardian: v.guardian })),
]);
export type FamilyMove = z.output<typeof familyMoveSchema>;

/** «الطالب هو ولي الأمر»: the family's number is the student's own (an adult learner). */
export const contactSelfSchema = z.strictObject({ contact_is_self: z.boolean() });
export type ContactSelf = z.output<typeof contactSelfSchema>;

/** The guardian picker: a name, a number (main or second) or a student's code. */
export const familySearchSchema = z.object({ search: z.string().trim().min(2).max(100) });

/** A record id in a /people/* path (a 400 for anything else). */
export const peopleIdSchema = z.guid();

/**
 * The 409 codes of the moves and conversions (404 student_not_found / guardian_not_found aside):
 * same_guardian, guardian_changed (a race), family_has_self (another child already holds the
 * number), guardian_has_self, student_has_records (lessons, packages, payments, reports or chat
 * messages would be orphaned), student_has_login, phone_taken, duplicate_student.
 */
export const PEOPLE_EDIT_ERRORS = [
  'same_guardian',
  'guardian_changed',
  'family_has_self',
  'guardian_has_self',
  'student_has_records',
  'student_has_login',
  'guardian_has_login',
  'self_has_login',
  'phone_taken',
  'duplicate_student',
  'student_not_found',
  'guardian_not_found',
] as const;
export type PeopleEditError = (typeof PEOPLE_EDIT_ERRORS)[number];
