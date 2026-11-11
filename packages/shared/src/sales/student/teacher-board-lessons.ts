import { isOpenLesson, type LessonView } from '@ab/schedule';
import type { ReportStatus } from '@ab/catalog';
import { countKinds, teacherAttendanceKind, type AttendanceCounts } from './teacher-attendance.js';

/** The board window (docs/46 D4): 14 days back, 14 days ahead. */
export const BOARD_DAYS = 14;

/** One student's row on the teacher board, from the teacher's own lessons in the window. */
export interface StudentLessons {
  /** Hers with this student, oldest first. */
  lessons: LessonView[];
  /** The newest lesson that already started. */
  last: LessonView | null;
  /** The first open lesson still ahead. */
  next: LessonView | null;
  /** The student's newest report on a started lesson (its lesson id and status). */
  report: { lessonId: string; status: ReportStatus } | null;
  /** Kinds of the started lessons (teacherAttendanceKind). */
  counts: AttendanceCounts;
}

const startsAt = (l: LessonView): number => Date.parse(l.starts_at);
const ownOf = (l: LessonView, studentId: string) => l.students.find((s) => s.id === studentId);

/** Lessons of one student (lesson.students[].id), oldest first. */
export function lessonsOfStudent(lessons: readonly LessonView[], studentId: string): LessonView[] {
  return lessons
    .filter((l) => ownOf(l, studentId) !== undefined)
    .sort((a, b) => startsAt(a) - startsAt(b));
}

function lastReport(started: readonly LessonView[], studentId: string): StudentLessons['report'] {
  const withReport = started.filter((l) => ownOf(l, studentId)?.report);
  const lesson = withReport.at(-1);
  const report = lesson ? ownOf(lesson, studentId)?.report : null;
  return lesson && report ? { lessonId: lesson.id, status: report.status } : null;
}

/** The board's summary of one student at `now` (pure: the same on web and mobile). */
export function studentLessons(
  lessons: readonly LessonView[],
  o: { studentId: string; now: Date },
): StudentLessons {
  const mine = lessonsOfStudent(lessons, o.studentId);
  const started = mine.filter((l) => startsAt(l) <= o.now.getTime());
  const next = mine.find((l) => startsAt(l) > o.now.getTime() && isOpenLesson(l.status)) ?? null;
  const kinds = started.map((l) =>
    teacherAttendanceKind(l.status, ownOf(l, o.studentId)?.attendance ?? null),
  );
  return {
    lessons: mine,
    last: started.at(-1) ?? null,
    next,
    report: lastReport(started, o.studentId),
    counts: countKinds(kinds),
  };
}
