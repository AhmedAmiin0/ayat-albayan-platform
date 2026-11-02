import {
  isAutoHeldDue,
  startOfLocalDay,
  type LessonStatus,
  type SubscriptionStatus,
} from '@ab/shared';

// Which open lessons the auto-held job closes (owner 2026-11-02): isAutoHeldDue on each, with every
// student's CURRENT package start (the latest one, not cancelled, that has started by now): a
// lesson
// left open on an earlier package is never closed onto the balance now.

export interface OpenEndedLesson {
  id: string;
  status: LessonStatus;
  ends_at: string;
  lesson_students: { student_id: string; student: { tz: string } | null }[];
}

export interface PackageRow {
  student_id: string;
  starts_on: string;
  status: SubscriptionStatus;
}

interface Who {
  studentId: string;
  tz: string;
  at: Date;
}

/** When the student's current package (the latest started by `at`) began; null = none (a trial). */
export function currentPackageStart(rows: readonly PackageRow[], who: Who): Date | null {
  const starts = rows
    .filter((r) => r.student_id === who.studentId && r.status !== 'cancelled')
    .map((r) => startOfLocalDay(r.starts_on, who.tz))
    .filter((d) => d.getTime() <= who.at.getTime());
  return starts.reduce<Date | null>((latest, d) => (latest && latest > d ? latest : d), null);
}

/** The lessons to hold now, in the order read. */
interface DueInput {
  lessons: readonly OpenEndedLesson[];
  packages: readonly PackageRow[];
  now: Date;
}

export function dueLessons(input: DueInput): OpenEndedLesson[] {
  const { packages, now } = input;
  return input.lessons.filter((lesson) => {
    const packageStarts = lesson.lesson_students.map((ls) => {
      const tz = ls.student?.tz ?? 'UTC';
      return currentPackageStart(packages, { studentId: ls.student_id, tz, at: now });
    });
    return isAutoHeldDue({ status: lesson.status, ends_at: lesson.ends_at, packageStarts }, now);
  });
}

/** Every student id on the lessons, each once. */
export const studentIdsOf = (lessons: readonly OpenEndedLesson[]): string[] => [
  ...new Set(lessons.flatMap((l) => l.lesson_students.map((ls) => ls.student_id))),
];
