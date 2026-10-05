import { z } from 'zod';

/** A recording row's life: under way, ready, failed, or removed (file gone, row kept). */
export const STUDENT_RECORDING_STATUSES = ['recording', 'done', 'failed', 'deleted'] as const;
export type StudentRecordingStatus = (typeof STUDENT_RECORDING_STATUSES)[number];

/** What a player needs for the file: video for an MP4, audio for a sound-only file. */
export type StudentRecordingMedia = 'video' | 'audio';

/**
 * One recording on a student's file (GET /students/:id/recordings). A group lesson's recording
 * appears in each attending student's file. No storage path: `url` is a 1-hour signed link, only
 * for a finished file.
 */
export interface StudentRecordingView {
  id: string;
  lesson_id: string;
  /** The lesson's start (UTC); the recording itself started at `started_at`. */
  lesson_starts_at: string;
  started_at: string;
  teacher: { id: string; display_name_ar: string } | null;
  status: StudentRecordingStatus;
  duration_seconds: number | null;
  size_bytes: number | null;
  media: StudentRecordingMedia;
  visible_to_student: boolean;
  /** The viewer may show/hide it (PATCH /recordings/:id/visibility): an admin, or the lesson's own teacher. */
  can_manage: boolean;
  url: string | null;
}

export interface StudentRecordingsPage {
  items: StudentRecordingView[];
  total: number;
  page: number;
  pageSize: number;
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** ?page&pageSize and the filters: lesson day range (UTC dates, both ends included) and teacher. */
export const studentRecordingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  from: day.optional(),
  to: day.optional(),
  teacherId: z.string().uuid().optional(),
});
export type StudentRecordingsQuery = z.output<typeof studentRecordingsQuerySchema>;

/** PATCH /recordings/:id/visibility: show (true) or hide (false) a recording from the student. */
export const recordingVisibilitySchema = z.object({ visible: z.boolean() });
export type RecordingVisibility = z.output<typeof recordingVisibilitySchema>;

/** Is the recording's file video or audio? By the object's extension; MP4 (the egress) is video. */
export function mediaOfPath(path: string): StudentRecordingMedia {
  return /\.(mp3|m4a|aac|ogg|wav)$/i.test(path) ? 'audio' : 'video';
}

/** Whole seconds between the start and the end of a recording; null while it runs or on bad dates. */
export function durationSeconds(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : null;
}
