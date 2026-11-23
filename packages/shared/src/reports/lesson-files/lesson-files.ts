import { z } from 'zod';
import { attachmentUploadSchema } from '../schema/index.js';

// «ملفات الحلقة» (owner 2026-11-17, migration 20261117150200): files staff add to a lesson, kept
// in the report-attachments bucket (same types and 25 MiB cap), each shown to the family or not.

/** A homework sheet, a teacher's voice note, a whiteboard snapshot, or other teacher material. */
export const LESSON_FILE_KINDS = ['homework', 'voice_note', 'whiteboard', 'material'] as const;
export type LessonFileKind = (typeof LESSON_FILE_KINDS)[number];

/** How a client shows the file: a picture, a PDF, or the in-app audio player. */
export const LESSON_FILE_MEDIA = ['image', 'pdf', 'audio'] as const;
export type LessonFileMedia = (typeof LESSON_FILE_MEDIA)[number];

const MEDIA_BY_TOP: Readonly<Record<string, LessonFileMedia>> = { image: 'image', audio: 'audio' };

/** By the mime's top type; anything else the bucket admits is a PDF. */
export function lessonFileMediaOf(mime: string): LessonFileMedia {
  return MEDIA_BY_TOP[mime.split('/')[0] ?? ''] ?? 'pdf';
}

const title = z.string().trim().min(1).max(120);

/** One lesson file as staff see it; no storage path (a signed link is minted per tap). */
export const lessonFileViewSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  kind: z.enum(LESSON_FILE_KINDS),
  title: z.string().nullable(),
  mime: z.string(),
  size: z.number(),
  media: z.enum(LESSON_FILE_MEDIA),
  visible_to_family: z.boolean(),
  created_at: z.string(),
});
export type LessonFileView = z.output<typeof lessonFileViewSchema>;

/** POST /lessons/:id/files/upload-url: the file's type, size and kind (checked before signing). */
export const lessonFileUploadSchema = attachmentUploadSchema.extend({
  kind: z.enum(LESSON_FILE_KINDS),
});
export type LessonFileUpload = z.output<typeof lessonFileUploadSchema>;

/** POST /lessons/:id/files: registers the uploaded object under this lesson. */
export const lessonFileRegisterSchema = lessonFileUploadSchema.extend({
  path: z.string().min(1),
  title: title.optional(),
  visible_to_family: z.boolean().default(true),
});
export type LessonFileRegister = z.output<typeof lessonFileRegisterSchema>;

/** PATCH /lesson-files/:id/visibility: «يراه الطالب وولي الأمر» on or off. */
export const lessonFileVisibilitySchema = z.object({ visible: z.boolean() });
export type LessonFileVisibility = z.output<typeof lessonFileVisibilitySchema>;
