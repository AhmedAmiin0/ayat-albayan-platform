import { z } from 'zod';
import { GOOGLE_SYNC_MODES, GOOGLE_WINDOW_DAYS, TEACHER_CALENDAR_OWNERS } from './enums.js';

/** A Google id as the APIs return them (calendar ids are emails; Drive ids are [A-Za-z0-9_-]). */
const calendarId = z.string().trim().min(1).max(300).regex(/^[A-Za-z0-9_.@#-]+$/);
const fileId = z.string().trim().min(10).max(200).regex(/^[A-Za-z0-9_-]+$/);

/** PUT /admin/google/settings: only the fields that change. */
export const googleSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    mode: z.enum(GOOGLE_SYNC_MODES).optional(),
    window_days: z.number().int().min(GOOGLE_WINDOW_DAYS.min).max(GOOGLE_WINDOW_DAYS.max).optional(),
  })
  .strict();
export type GoogleSettingsInput = z.infer<typeof googleSettingsSchema>;

/** PUT /admin/google/teachers/:id: confirm a calendar; null removes the mapping. */
export const googleTeacherMapSchema = z.object({ calendar_id: calendarId.nullable() }).strict();
export type GoogleTeacherMapInput = z.infer<typeof googleTeacherMapSchema>;

/**
 * PUT /admin/google/students/:id: confirm the student's existing folder and attendance sheet, or
 * both null = «أنشئ مجلدًا جديدًا» on the first report. A sheet without a folder is refused.
 */
export const googleStudentMapSchema = z
  .object({ folder_id: fileId.nullable(), attendance_sheet_id: fileId.nullable() })
  .strict()
  .refine((v) => v.folder_id !== null || v.attendance_sheet_id === null, { path: ['attendance_sheet_id'], message: 'folder_required' });
export type GoogleStudentMapInput = z.infer<typeof googleStudentMapSchema>;

/** PUT /admin/google/drive: confirm the root folder and the summary sheet found by discovery. */
export const googleDriveSchema = z.object({ root_folder_id: fileId, summary_sheet_id: fileId.nullable() }).strict();
export type GoogleDriveInput = z.infer<typeof googleDriveSchema>;

/** PUT /admin/google/teachers/:id/calendar-owner: who builds the teacher's calendar. */
export const teacherCalendarOwnerSchema = z.object({ owner: z.enum(TEACHER_CALENDAR_OWNERS) }).strict();
export type TeacherCalendarOwnerInput = z.infer<typeof teacherCalendarOwnerSchema>;
