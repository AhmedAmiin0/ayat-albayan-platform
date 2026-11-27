import { id, instant } from '@ab/core';
import { z } from 'zod';
import { TEACHER_CALENDAR_OWNERS } from './enums';
import { googleFoundSchema } from './status.schemas';

const count = z.number().int().nonnegative();

/** GET /admin/google/teachers: one row per active teacher. */
export const googleTeacherMapRowSchema = z.object({
  teacher_id: id(),
  name: z.string(),
  calendar_id: z.string().nullable(),
  calendar_name: z.string().nullable(),
  confirmed_at: instant.nullable(),
  /** Matched by name from the last discovery. */
  suggestion: googleFoundSchema.nullable(),
});
export type GoogleTeacherMapRow = z.infer<typeof googleTeacherMapRowSchema>;

/** A folder matched in the summary sheet by normalised Arabic name. */
export const googleFolderSuggestionSchema = z.object({
  folder_id: z.string(),
  attendance_sheet_id: z.string().nullable(),
  name: z.string(),
});

/** GET /admin/google/students: one row per trial/active student. */
export const googleStudentMapRowSchema = z.object({
  student_id: id(),
  code: z.string(),
  name: z.string(),
  folder_id: z.string().nullable(),
  attendance_sheet_id: z.string().nullable(),
  /** Confirmed with no folder: the platform creates folder and sheet on the first report. */
  create_new: z.boolean(),
  confirmed_at: instant.nullable(),
  suggestion: googleFolderSuggestionSchema.nullable(),
});
export type GoogleStudentMapRow = z.infer<typeof googleStudentMapRowSchema>;

/** Who builds the teacher's calendar, and how its events fare. */
export const teacherCalendarViewSchema = z.object({
  teacher_id: id(),
  owner: z.enum(TEACHER_CALENDAR_OWNERS),
  changed_at: instant.nullable(),
  /** This teacher's teacher-calendar items the platform wrote (synced). */
  managed: count,
  /** Items not written because the old script's event is still there. */
  script_event_present: count,
});
export type TeacherCalendarView = z.infer<typeof teacherCalendarViewSchema>;
