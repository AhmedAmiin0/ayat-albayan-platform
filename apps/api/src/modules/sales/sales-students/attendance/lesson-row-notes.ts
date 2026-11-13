import type { Json } from '@ab/db';
import { COURSE_PAUSE_REASON, zonedPartsIn } from '@ab/shared';
import { z } from 'zod';
import type { AttendanceLessonRow } from './student-attendance.rows';

/** Whose reading of a row: staff (attendanceKind) or the teacher (auto-held = unmarked). */
export type AttendanceReader = 'staff' | 'teacher';

type NoteLesson = Pick<
  AttendanceLessonRow,
  | 'status'
  | 'cancel_reason'
  | 'starts_at'
  | 'rule'
  | 'teacher_id'
  | 'moved_from'
  | 'moved_to'
  | 'time_edit_was'
>;

/** One-lesson cancels whose reason is shown (docs/47): by her, by the academy, the family's. */
const REASON_STATUSES: ReadonlySet<string> = new Set([
  'cancelled_by_teacher',
  'cancelled_by_admin',
  'excused',
]);

const isReasonStatus = (l: NoteLesson): boolean => REASON_STATUSES.has(l.status);

/**
 * The lesson's day (in its rule's zone) is on or after the rule's last day: closed by ending the
 * series or stopping the course (endRule, stop_course), whose text can mention money.
 */
export function seriesEnded(l: Pick<NoteLesson, 'starts_at' | 'rule'>): boolean {
  const rule = l.rule;
  if (!rule?.ends_on) return false;
  return zonedPartsIn(new Date(l.starts_at), rule.tz).date >= rule.ends_on;
}

const isPause = (l: NoteLesson): boolean => l.cancel_reason === COURSE_PAUSE_REASON;

/** Whose cancel reasons a reader sees: the teacher never a series-end or stop text (docs/47). */
export const reasonShown: Record<AttendanceReader, (l: NoteLesson) => boolean> = {
  staff: isReasonStatus,
  teacher: (l) => isReasonStatus(l) && (isPause(l) || !seriesEnded(l)),
};

const iso = (at: string): string => new Date(at).toISOString();
const wasTimes = z.object({ starts_at: z.string() });

/** The time an in-place time edit replaced (lessons.mapper.ts timeEdit); null when unreadable. */
function wasStart(was: Json | null): string | null {
  const parsed = wasTimes.safeParse(was);
  return parsed.success ? iso(parsed.data.starts_at) : null;
}

/** The replaced lesson's reason crosses over only when both lessons are hers (docs/47 gap 14). */
function inheritedReason(l: NoteLesson): string | null {
  const from = l.moved_from;
  return from !== null && from.teacher_id === l.teacher_id ? from.cancel_reason : null;
}

const moveReason = (l: NoteLesson): string | null =>
  l.status === 'rescheduled' ? l.cancel_reason : inheritedReason(l);

/** AttendanceTableRow's move keys, always present (null when the lesson never moved). */
interface MoveLines {
  moved_from: string | null;
  moved_to: string | null;
  move_reason: string | null;
}

/** The row's move lines: where it went, what it replaced, and why (ISO instants). */
export function moveOf(l: NoteLesson): MoveLines {
  const to = l.moved_to[0]?.starts_at;
  return {
    moved_from: l.moved_from ? iso(l.moved_from.starts_at) : wasStart(l.time_edit_was),
    moved_to: to === undefined ? null : iso(to),
    move_reason: moveReason(l),
  };
}
