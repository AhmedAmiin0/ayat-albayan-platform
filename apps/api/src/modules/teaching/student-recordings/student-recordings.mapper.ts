import { addCalendarDays, durationSeconds, mediaOfPath, STUDENT_RECORDING_STATUSES, type StudentRecordingStatus, type StudentRecordingView } from '@ab/shared';
import type { RecordingRow } from '../classroom/recordings/recording.queries';

/** A recording with the lesson it belongs to, as the student file's query selects it. */
export type RecordingJoinRow = RecordingRow & {
  lessons: {
    starts_at: string;
    teacher_id: string;
    teachers: { id: string; display_name_ar: string; display_name_en: string | null } | null;
  } | null;
};

/** An unknown status reads as failed: the file is not trusted to play. */
const asStatus = (s: string): StudentRecordingStatus => STUDENT_RECORDING_STATUSES.find((x) => x === s) ?? 'failed';

/**
 * A row as the clients see it: no storage path, `url` only for a finished file (the caller signs
 * it), `duration_seconds` from the start and end, `size_bytes` when the egress told us.
 */
export function studentRecordingView(row: RecordingJoinRow, ctx: { url: string | null; canManage: boolean }): StudentRecordingView {
  const status = asStatus(row.status);
  return {
    id: row.id,
    lesson_id: row.lesson_id ?? '',
    lesson_starts_at: row.lessons?.starts_at ?? row.started_at,
    started_at: row.started_at,
    teacher: row.lessons?.teachers ?? null,
    status,
    duration_seconds: durationSeconds(row.started_at, row.ended_at),
    size_bytes: row.size_bytes,
    media: mediaOfPath(row.file_path),
    visible_to_student: row.visible_to_student,
    can_manage: ctx.canManage,
    url: status === 'done' ? ctx.url : null,
  };
}

/** Who may toggle visibility on this file's rows: every row for an admin, the lesson's own teacher otherwise. */
export type ManageRule = 'all' | { teacherId: string } | 'none';

export function canManage(rule: ManageRule, row: RecordingJoinRow): boolean {
  if (rule === 'all') return true;
  return rule !== 'none' && row.lessons?.teacher_id === rule.teacherId;
}

/** The UTC bounds of a `from`/`to` day range: [from 00:00, the day after `to` 00:00). */
export function dayBounds(range: { from?: string | undefined; to?: string | undefined }): { gte: string | null; lt: string | null } {
  const next = (day: string): string => `${addCalendarDays(day, 1)}T00:00:00.000Z`;
  return {
    gte: range.from ? `${range.from}T00:00:00.000Z` : null,
    lt: range.to ? next(range.to) : null,
  };
}
