import {
  attendanceKind,
  type AttendanceKind,
  type PortalHistoryRow,
  type PortalHistoryStatus,
  type PortalMonth,
  type PortalOutcome,
} from '@ab/shared';
import { familyReason } from '@/modules/sales/sales-students';
import type { PortalPastRow } from './portal-history.repo';

/** A past lesson with the student's outcome (only attended, absent or excused ones). */
export type PastLesson = PortalPastRow & { outcome: PortalOutcome };

/** Staff's attendanceKind → the family's outcome; cancelled and unmarked lessons are in no list. */
const OUTCOME: Partial<Record<AttendanceKind, PortalOutcome>> = {
  present: 'attended',
  absent: 'absent',
  excused: 'excused',
};
/** An excused absence still counts as absent. */
const LIST: Record<PortalOutcome, PortalHistoryStatus> = {
  attended: 'attended',
  absent: 'absent',
  excused: 'absent',
};

/** The student's outcome of a lesson (attendanceKind on its own row), null when in no list. */
export function outcomeOf(row: PortalPastRow): PortalOutcome | null {
  const kind = attendanceKind(row.status, row.own[0]?.attendance ?? null);
  return kind === null ? null : (OUTCOME[kind] ?? null);
}

/** The rows of one list, with their outcome ([] = not in it): collectPage's `pick`. */
export const pickFor =
  (status: PortalHistoryStatus) =>
  (row: PortalPastRow): PastLesson[] => {
    const outcome = outcomeOf(row);
    return outcome !== null && LIST[outcome] === status ? [{ ...row, outcome }] : [];
  };

/** This month's counts: attended, and absent with the excused ones. */
export function monthCounts(rows: readonly PortalPastRow[]): PortalMonth {
  const counts: PortalMonth = { attended: 0, absent: 0 };
  for (const row of rows) {
    const outcome = outcomeOf(row);
    if (outcome !== null) counts[LIST[outcome]] += 1;
  }
  return counts;
}

/** lesson id → the SENT report id; lesson id → the visible recording id. */
interface HistoryRefs {
  reports: ReadonlyMap<string, string>;
  recordings: ReadonlyMap<string, string>;
}

/**
 * Whitelist: time, the teacher's display names, the outcome, the family's own excuse. The recording
 * rides on a sent report (the same lessons POST …/recordings/:id/url opens).
 */
export function toHistoryRow(lesson: PastLesson, refs: HistoryRefs): PortalHistoryRow {
  const report = refs.reports.get(lesson.id) ?? null;
  return {
    lesson_id: lesson.id,
    starts_at: lesson.starts_at,
    ends_at: lesson.ends_at,
    teacher: teacherOf(lesson),
    outcome: lesson.outcome,
    absence_reason: familyReason(lesson),
    report_id: report,
    recording_id: report === null ? null : (refs.recordings.get(lesson.id) ?? null),
  };
}

/** The teacher's display names only ('' when the teacher row is gone). */
function teacherOf({ teacher }: PortalPastRow): PortalHistoryRow['teacher'] {
  return { display_name_ar: teacher?.display_name_ar ?? '', display_name_en: teacher?.display_name_en ?? null };
}
