import { z } from 'zod';
import { pageOf, pageQuery } from '@ab/core';

/** A recording row's life: under way, ready, failed, or removed (file gone, row kept). */
export const STUDENT_RECORDING_STATUSES = ['recording', 'done', 'failed', 'deleted'] as const;
export const studentRecordingStatusSchema = z.enum(STUDENT_RECORDING_STATUSES);
export type StudentRecordingStatus = z.infer<typeof studentRecordingStatusSchema>;

/** What a player needs for the file: video for an (older) MP4, audio for a sound-only file. */
export const studentRecordingMediaSchema = z.enum(['video', 'audio']);
export type StudentRecordingMedia = z.infer<typeof studentRecordingMediaSchema>;

/**
 * One recording on a student's file (GET /students/:id/recordings). A group lesson's recording
 * appears in each attending student's file. No storage path: `url` is a 1-hour signed link, only
 * for a finished file.
 */
export const studentRecordingViewSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  /** The lesson's start (UTC); the recording itself started at `started_at`. */
  lesson_starts_at: z.string(),
  started_at: z.string(),
  teacher: z
    .object({ id: z.string(), display_name_ar: z.string(), display_name_en: z.string().nullable() })
    .nullable(),
  status: studentRecordingStatusSchema,
  duration_seconds: z.number().nullable(),
  size_bytes: z.number().nullable(),
  media: studentRecordingMediaSchema,
  visible_to_student: z.boolean(),
  /** The viewer may show/hide it (PATCH /recordings/:id/visibility): an admin or its teacher. */
  can_manage: z.boolean(),
  url: z.string().nullable(),
});
export type StudentRecordingView = z.infer<typeof studentRecordingViewSchema>;

export const studentRecordingsPageSchema = pageOf(studentRecordingViewSchema);
export type StudentRecordingsPage = z.infer<typeof studentRecordingsPageSchema>;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * ?page&pageSize and the filters: lesson day range (UTC dates, both ends included), teacher and
 * state.
 */
export const studentRecordingsQuerySchema = z.object({
  ...pageQuery({ size: 10 }),
  from: day.optional(),
  to: day.optional(),
  teacherId: z.string().uuid().optional(),
  /** Only rows in this state; absent means every state. */
  status: studentRecordingStatusSchema.optional(),
});
export type StudentRecordingsQuery = z.output<typeof studentRecordingsQuerySchema>;
/** The list's filters as a client sends them (no page): empty = no filter. */
export type StudentRecordingFilters = Omit<
  z.input<typeof studentRecordingsQuerySchema>,
  'page' | 'pageSize'
>;

/** PATCH /recordings/:id/visibility: show (true) or hide (false) a recording from the student. */
export const recordingVisibilitySchema = z.object({ visible: z.boolean() });
export type RecordingVisibility = z.output<typeof recordingVisibilitySchema>;

/** The PATCH's answer: the recording and its new flag. */
export const recordingVisibilityResultSchema = z.object({
  id: z.string(),
  visible_to_student: z.boolean(),
});

/**
 * Is the recording's file video or audio? By the object's extension: the egress writes MP3 (audio
 * only since 2026-10-06); older rows are MP4 room videos and keep their video player.
 */
export function mediaOfPath(path: string): StudentRecordingMedia {
  return /\.(mp3|m4a|aac|ogg|wav)$/i.test(path) ? 'audio' : 'video';
}

/** Whole seconds between the start and the end of a recording; null while it runs or on bad dates. */
export function durationSeconds(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : null;
}
