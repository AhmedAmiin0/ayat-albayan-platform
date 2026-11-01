import { z } from 'zod';
import {
  GENDERS,
  LEAD_SOURCES,
  PROGRAMS,
  STUDENT_STATUSES,
  TEACHER_STATUSES,
} from '@ab/catalog';
import { TEACHER_MEETING_MODES } from '../../schedule/classroom/meeting-mode.js';
import { optionalText, phoneE164, requiredText, timeZone } from '@ab/core';
import { username } from '../users/index.js';

// DTOs use DB column names (snake_case) so they map 1:1 onto TablesInsert<...>.
// Server-derived columns (code, name_normalized, created_by, …) are deliberately absent.

/** R-STU-02, R-STU-04. */
export const guardianCreateSchema = z.object({
  name: requiredText,
  phone_e164: phoneE164,
  country: optionalText,
  tz: timeZone,
  source: z.enum(LEAD_SOURCES).nullish(),
  notes: optionalText,
});
export const guardianUpdateSchema = guardianCreateSchema.partial();

/** R-STU-01, R-STU-05. */
export const studentCreateSchema = z.object({
  guardian_id: z.uuid(),
  name: requiredText,
  age: z.int().min(3).max(99).nullish(),
  gender: z.enum(GENDERS).nullish(),
  program: z.enum(PROGRAMS).default('quran'),
  level: optionalText,
  memorized: optionalText,
  goal: optionalText,
  riwaya: optionalText,
  tz: timeZone,
  status: z.enum(STUDENT_STATUSES).default('new'),
  teacher_id: z.uuid().nullish(),
  /** Teacher gender filter in the booking wizard (R-SCH-06); null = no preference. */
  teacher_gender_pref: z.enum(GENDERS).nullish(),
  meeting_link_override: z.url().nullish(),
  notes: optionalText,
  /** «رقم الواتساب لـ: الطالب نفسه» (docs/30, a docs/13 deviation): wording only; the DB default is false. */
  contact_is_self: z.boolean().optional(),
});
/**
 * PATCH /students/:id. `expected_status`: the status the client last saw; the API writes only while
 * the row still has it, else 409 `status_changed` (R-STU-05: stale forms never undo automatic moves).
 */
export const studentUpdateSchema = studentCreateSchema
  .omit({ guardian_id: true })
  .partial()
  .extend({ expected_status: z.enum(STUDENT_STATUSES).optional() });

const rate = z.int().min(0).nullish();

/** R-TCH-01. Rates are per lesson in EGP, by duration. */
export const teacherCreateSchema = z.object({
  display_name_ar: requiredText,
  display_name_en: optionalText,
  gender: z.enum(GENDERS),
  programs: z.array(z.enum(PROGRAMS)).min(1),
  phone_e164: phoneE164.nullish(),
  meeting_link: z.url().nullish(),
  /** null = follow settings.meeting_link_auto (migration 490). */
  meeting_mode: z.enum(TEACHER_MEETING_MODES).nullish(),
  rate_30: rate,
  rate_45: rate,
  rate_60: rate,
  rate_90: rate,
  max_students: z.int().min(1).nullish(),
  status: z.enum(TEACHER_STATUSES).default('active'),
  tz: timeZone,
});
/** `username`: written to the teacher's login profile (docs/30); null clears it. Needs a linked login. */
export const teacherUpdateSchema = teacherCreateSchema.partial().extend({ username: username.nullish() });

export type GuardianCreate = z.infer<typeof guardianCreateSchema>;
export type GuardianUpdate = z.infer<typeof guardianUpdateSchema>;
export type StudentCreate = z.infer<typeof studentCreateSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;
export type TeacherCreate = z.infer<typeof teacherCreateSchema>;
export type TeacherUpdate = z.infer<typeof teacherUpdateSchema>;
