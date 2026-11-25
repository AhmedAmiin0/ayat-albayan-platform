import { STUDENT_RECORDING_STATUSES } from '@ab/schedule';
import { z } from 'zod';
import { lessonFileViewSchema } from './lesson-files';

// A lesson's assets together: the recording(s), the reports' PDFs and the lesson files. Staff read
// GET /lessons/:id/files; the family reads its whitelisted twin under /portal (no staff names).

const teacherSchema = z
  .object({ display_name_ar: z.string(), display_name_en: z.string().nullable() })
  .nullable();

const mediaSchema = z.enum(['video', 'audio']);

/** One recording of the lesson for staff; `url` is a 1-hour link to a finished file. */
export const lessonAssetRecordingSchema = z.object({
  id: z.string(),
  status: z.enum(STUDENT_RECORDING_STATUSES),
  /** ended_at is null while it runs. */
  started_at: z.string(),
  ended_at: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  size_bytes: z.number().nullable(),
  media: mediaSchema,
  visible_to_student: z.boolean(),
  url: z.string().nullable(),
});
export type LessonAssetRecording = z.output<typeof lessonAssetRecordingSchema>;

/** A student's report of the lesson: its PDF opens through GET /reports/:id/pdf-url. */
export const lessonAssetReportSchema = z.object({
  id: z.string(),
  student_name: z.string(),
  pdf_ready: z.boolean(),
  sent_at: z.string().nullable(),
});

/** GET /lessons/:id/files: admin, or the lesson's own teacher. */
export const lessonAssetsSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  students: z.array(z.object({ id: z.string(), name: z.string(), code: z.string().nullable() })),
  recordings: z.array(lessonAssetRecordingSchema),
  reports: z.array(lessonAssetReportSchema),
  files: z.array(lessonFileViewSchema),
});
export type LessonAssets = z.output<typeof lessonAssetsSchema>;

/** A recording the family may play: finished, shown by staff, of a one-student lesson. */
export const portalRecordingSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  report_id: z.string().nullable(),
  lesson_starts_at: z.string(),
  teacher: teacherSchema,
  duration_seconds: z.number().nullable(),
  size_bytes: z.number().nullable(),
  media: mediaSchema,
});
export type PortalRecording = z.output<typeof portalRecordingSchema>;

/** GET /portal/students/:id/recordings: newest first. */
export const portalRecordingsSchema = z.object({ items: z.array(portalRecordingSchema) });
export type PortalRecordings = z.output<typeof portalRecordingsSchema>;

/** A lesson file as the family sees it (visible ones only). */
export const portalLessonFileSchema = lessonFileViewSchema.omit({ visible_to_family: true });
export type PortalLessonFile = z.output<typeof portalLessonFileSchema>;

/** GET /portal/students/:id/lessons/:lessonId/files: the family's lesson page. */
export const portalLessonAssetsSchema = z.object({
  lesson_id: z.string(),
  lesson_starts_at: z.string(),
  lesson_ends_at: z.string(),
  teacher: teacherSchema,
  report_id: z.string().nullable(),
  recordings: z.array(portalRecordingSchema),
  files: z.array(portalLessonFileSchema),
});
export type PortalLessonAssets = z.output<typeof portalLessonAssetsSchema>;

/** With a download name the link saves the file (Content-Disposition: attachment). */
export const portalLessonFileUrlQuerySchema = z.object({
  download: z.string().trim().min(1).max(160).optional(),
});
export type PortalLessonFileUrlQuery = z.output<typeof portalLessonFileUrlQuerySchema>;
