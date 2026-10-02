import type { Conflict } from '@ab/shared';
import { expandRow, type TimeRange, type WeeklyRow } from '../teachers/availability/free-slots';
import { mergeIntervals, type Interval } from '../teachers/availability/intervals';
import type { Occurrence } from './occurrences';

/** An occupying lesson already booked (status in OCCUPYING_LESSON_STATUSES). */
export type BusyLesson = { id: string; starts_at: Date; ends_at: Date };
export type StudentBusyLesson = BusyLesson & { student_id: string };

export type ConflictInput = {
  /** What is about to be booked or moved (ruleOccurrences output, or one moved lesson). */
  proposed: readonly Occurrence[];
  /** The teacher's occupying lessons around the proposed span, minus the lesson being moved. */
  teacherLessons: readonly BusyLesson[];
  /** The students' occupying lessons, one row per (lesson, student_id), minus the moved one. */
  studentLessons: readonly StudentBusyLesson[];
  /** The teacher's weekly grid (teacher_availability) and time off (teacher_time_off, UTC). */
  availability: readonly WeeklyRow[];
  timeOff: readonly TimeRange[];
};

type Span = { starts_at: Date; ends_at: Date };
const overlaps = (a: Span, b: Span) => a.starts_at < b.ends_at && b.starts_at < a.ends_at;

/**
 * Every clash of every proposed occurrence (R-SCH-04, issue B3). Pure; the caller loads the rows.
 * outside_availability = not fully inside one (merged) availability window; time_off / busy =
 * any overlap (touching end-to-start is not a clash). Empty result = free to book.
 */
export function findConflicts(input: ConflictInput): Conflict[] {
  if (input.proposed.length === 0) return [];
  const span: Interval = {
    start: Math.min(...input.proposed.map((p) => p.starts_at.getTime())),
    end: Math.max(...input.proposed.map((p) => p.ends_at.getTime())),
  };
  const windows = mergeIntervals(input.availability.flatMap((row) => expandRow(row, span)));
  return input.proposed.flatMap((p) => conflictsAt(p, input, windows));
}

function conflictsAt(p: Occurrence, input: ConflictInput, windows: Interval[]): Conflict[] {
  const at = { startsAt: p.starts_at.toISOString(), endsAt: p.ends_at.toISOString() };
  const [s, e] = [p.starts_at.getTime(), p.ends_at.getTime()];
  const out: Conflict[] = [];
  if (!windows.some((w) => w.start <= s && e <= w.end)) {
    out.push({ kind: 'outside_availability', ...at });
  }
  if (input.timeOff.some((t) => overlaps(p, { starts_at: t.start, ends_at: t.end }))) {
    out.push({ kind: 'time_off', ...at });
  }
  for (const l of input.teacherLessons) {
    if (overlaps(p, l)) out.push({ kind: 'teacher_busy', ...at, lessonId: l.id });
  }
  for (const l of input.studentLessons) {
    if (overlaps(p, l)) {
      out.push({ kind: 'student_busy', ...at, lessonId: l.id, studentId: l.student_id });
    }
  }
  return out;
}
