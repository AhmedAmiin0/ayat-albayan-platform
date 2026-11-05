import { GENDERS } from '@ab/catalog';
import { z } from 'zod';

// The /people/* answers (people.edit, students.attach_guardian, people.switch_role): what
// «تعديل البيانات», «ربط بولي أمر آخر» and «تحويل» read, on web and mobile, for the assistant and
// the admin alike. The apps parse them; phones are E.164 (rule 7), the code generated (AB-nnnn).

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
  /** The admin's only (owner 2026-10-27): absent for every other role. */
  notes: text.optional(),
  teacher_gender_pref: gender,
  contact_is_self: z.boolean(),
  has_login: z.boolean(),
  /** Lessons, packages, money, reports, messages…: «تحويل إلى ولي أمر» is refused. */
  has_records: z.boolean(),
});
export type PeopleEditStudent = z.infer<typeof peopleEditStudentSchema>;

/** The family: every number (main and second) and every child, this student included. */
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

/** A move or «تحويل إلى ولي أمر»: the family the student is in now, or that remains. */
export const familyReplySchema = z.object({ guardian_id: z.string() });
