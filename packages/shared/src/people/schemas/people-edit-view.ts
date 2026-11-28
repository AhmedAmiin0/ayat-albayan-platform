import { GENDERS } from '@ab/catalog';
import { z } from 'zod';

// The /people/* answers for assistant and admin; phones E.164 (rule 7), code generated (AB-nnnn).

const text = z.string().nullable();
const gender = z.enum(GENDERS).nullable();
/** Generated, never typed; null only in the generated column's type. */
const code = z.string().nullable();

/** GET /people/students/:id → student. `has_login`: a login of its own is linked. */
export const peopleEditStudentSchema = z.object({
  id: z.string(),
  code,
  name: z.string(),
  age: z.number().nullable(),
  gender,
  level: text,
  memorized: text,
  goal: text,
  riwaya: text,
  tz: z.string(),
  /** The admin's only: absent for every other role. */
  notes: text.optional(),
  teacher_gender_pref: gender,
  contact_is_self: z.boolean(),
  /** The student's own WhatsApp (sign-in), E.164; null = none. */
  phone_e164: z.string().nullable(),
  has_login: z.boolean(),
  /** Any lessons, packages, money, reports or messages refuse the switch to guardian. */
  has_records: z.boolean(),
});
export type PeopleEditStudent = z.infer<typeof peopleEditStudentSchema>;

/**
 * The family: its own numbers (main and second; a student's own number is the student's) and
 * every child, this student included.
 */
export const peopleEditFamilySchema = z.object({
  id: z.string(),
  name: z.string(),
  phone_e164: z.string(),
  country: text,
  tz: z.string(),
  /** The admin's only, as the student's. */
  notes: text.optional(),
  /** A family login (phone + WhatsApp code): its main number and its adult learner stay put. */
  has_login: z.boolean(),
  phones: z.array(z.object({ phone_e164: z.string(), is_primary: z.boolean() })),
  students: z.array(
    z.object({ id: z.string(), code, name: z.string(), contact_is_self: z.boolean() }),
  ),
});
export type PeopleEditFamily = z.infer<typeof peopleEditFamilySchema>;

export const peopleEditViewSchema = z.object({
  student: peopleEditStudentSchema,
  guardian: peopleEditFamilySchema,
});
export type PeopleEditView = z.infer<typeof peopleEditViewSchema>;

/** One row of the guardian picker (GET /people/guardians?search=). */
export const familyOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone_e164: z.string(),
  students: z.array(z.object({ code, name: z.string() })),
});
export type FamilyOption = z.infer<typeof familyOptionSchema>;
export const familyOptionsSchema = z.array(familyOptionSchema);

/** POST /people/guardians/:id/to-student: the new student row of that family. */
export const convertedStudentSchema = z.object({ id: z.string(), code });
export type ConvertedStudent = z.infer<typeof convertedStudentSchema>;

/** After a move or switch: the family the student is in now, or that remains. */
export const familyReplySchema = z.object({ guardian_id: z.string() });

/** PATCH /people/students/:id and /people/guardians/:id: the edited row. */
export const peopleEditReplySchema = z.object({ id: z.string() });

/** POST /people/students/:id/guardian: the moved student and the family it is in now. */
export const familyMoveReplySchema = familyReplySchema.extend({ student_id: z.string() });

/** PATCH /people/students/:id/contact-self. */
export const contactSelfReplySchema = z.object({ id: z.string(), contact_is_self: z.boolean() });
