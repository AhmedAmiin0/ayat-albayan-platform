import { GENDERS, PROGRAMS, STUDENT_STATUSES } from '@ab/catalog';
import { z } from 'zod';
import { familyPhoneSchema } from '../../guardians/guardians.schemas';

export const studentRefSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string(),
  status: z.enum(STUDENT_STATUSES),
});
export type StudentRefView = z.infer<typeof studentRefSchema>;

/** One row of GET /students (v_student_list). */
export const studentListItemSchema = studentRefSchema.extend({
  program: z.enum(PROGRAMS),
  tz: z.string(),
  created_at: z.string(),
  package_remaining: z.number().nullable(),
  has_weekly: z.boolean(),
  guardian_name: z.string(),
  guardian_phone: z.string(),
  teacher_name: z.string().nullable(),
  is_test: z.boolean(),
});

/** Every column of `students`: what POST and PATCH /students answer. */
export const studentRowSchema = studentRefSchema.extend({
  age: z.number().nullable(),
  brought_at: z.string().nullable(),
  brought_by: z.string().nullable(),
  code_seq: z.number(),
  contact_is_self: z.boolean(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  gender: z.enum(GENDERS).nullable(),
  goal: z.string().nullable(),
  guardian_id: z.string(),
  is_test: z.boolean(),
  level: z.string().nullable(),
  meeting_link_override: z.string().nullable(),
  memorized: z.string().nullable(),
  name_normalized: z.string(),
  notes: z.string().nullable(),
  profile_id: z.string().nullable(),
  program: z.enum(PROGRAMS),
  riwaya: z.string().nullable(),
  teacher_gender_pref: z.enum(GENDERS).nullable(),
  teacher_id: z.string().nullable(),
  tz: z.string(),
  updated_at: z.string(),
});

/** GET /students/teacher-options: the active teachers. */
export const teacherOptionSchema = z.object({
  id: z.string(),
  display_name_ar: z.string(),
  meeting_link: z.string().nullable(),
});

/** GET /students/:id: the row, its family with every number, its teacher and siblings. */
export const studentProfileSchema = studentRowSchema.extend({
  guardian: z.object({
    id: z.string(),
    name: z.string(),
    phone_e164: z.string(),
    students: z.array(studentRefSchema),
    phones: z.array(familyPhoneSchema),
  }),
  teacher: teacherOptionSchema.extend({ display_name_en: z.string().nullable() }).nullable(),
  /** The override, else the teacher's fixed link (R-STU-05). */
  meeting_link: z.string().nullable(),
  siblings: z.array(studentRefSchema),
});

export const studentStatusCountsSchema = z.record(z.enum(STUDENT_STATUSES), z.number());

export const mergeAnswerSchema = z.object({ merge_id: z.string() });
