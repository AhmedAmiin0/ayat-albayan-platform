import { GENDERS, PROGRAMS, TEACHER_STATUSES } from '@ab/catalog';
import { pageQuery } from '@ab/core';
import { TEACHER_MEETING_MODES } from '@ab/schedule';
import { z } from 'zod';
import { teacherColumnQueryShape } from '../schemas';

/** GET /teachers: a name or phone search, the column filters and sort, 25 a page (R-NFR-08). */
export const teacherListQuerySchema = z.object({
  ...pageQuery({ size: 25 }),
  search: z.string().trim().max(100).optional(),
  ...teacherColumnQueryShape,
});
export type TeacherListQuery = z.infer<typeof teacherListQuerySchema>;

const rate = z.number().nullable();

/**
 * GET /teachers/:id (and POST / PATCH): the row without its stored photo path. `meeting_mode`: the
 * raw column (null = follow settings.meeting_link_auto); `platform_classroom`: what it resolves to
 * now (usesPlatform, migration 490).
 */
export const teacherViewSchema = z.object({
  id: z.string(),
  display_name_ar: z.string(),
  display_name_en: z.string().nullable(),
  gender: z.enum(GENDERS),
  programs: z.array(z.enum(PROGRAMS)),
  phone_e164: z.string().nullable(),
  meeting_link: z.string().nullable(),
  meeting_mode: z.enum(TEACHER_MEETING_MODES).nullable(),
  platform_classroom: z.boolean(),
  rate_30: rate,
  rate_45: rate,
  rate_60: rate,
  rate_90: rate,
  max_students: z.number().nullable(),
  status: z.enum(TEACHER_STATUSES),
  tz: z.string(),
  calendar_owner: z.string(),
  calendar_owner_changed_at: z.string().nullable(),
  calendar_owner_changed_by: z.string().nullable(),
  google_calendar_id: z.string().nullable(),
  mirror_enabled: z.boolean(),
  /** The teacher's login; null until created on the users page (docs/30). */
  profile_id: z.string().nullable(),
  /** That login's sign-in username (docs/30); null without one; GET /teachers rows carry none. */
  username: z.string().nullable().optional(),
  /** A short-lived signed URL; null = the initials. */
  avatar_url: z.string().nullable(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  updated_at: z.string(),
});
export type Teacher = z.infer<typeof teacherViewSchema>;

/** A row of GET /teachers: the teacher and her current students by kind (R-TCH-03). */
export const teacherListRowSchema = teacherViewSchema.extend({
  active_count: z.number(),
  trial_count: z.number(),
});
export type TeacherListRow = z.infer<typeof teacherListRowSchema>;
