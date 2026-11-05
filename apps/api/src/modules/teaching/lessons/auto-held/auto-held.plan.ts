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
  /** «عدّل الوقت» (R-SCH-11): a reminder made before it was about the old time. */
  time_edited_at?: string | null;
  lesson_students: { student_id: string; student: { tz: string } | null }[];
}

export interface PackageRow {
  student_id: string;
  starts_on: string;
  status: SubscriptionStatus;
  /** 'stopped' (course stopped, money kept: still on the balance) or 'unused' (a mistake). */
  cancel_kind: string | null;
}

interface Who {
  studentId: string;
  tz: string;
  at: Date;
}

/** Never reached: a lesson of a student whose current package was stopped is never held. */
const NEVER = new Date(8.64e15);

/** On the balance as migration 991 reads it: not cancelled, or cancelled as a stopped course. */
const onBalance = (r: PackageRow): boolean => r.status !== 'cancelled' || r.cancel_kind === 'stopped';

const startOf = (r: PackageRow, tz: string): Date =>
  r.status === 'cancelled' ? NEVER : startOfLocalDay(r.starts_on, tz);

/**
 * When the student's current package (the latest started by `at`) began; null = none (a trial).
 * A stopped course (its capacity frozen at the stop): NEVER, so nothing is closed onto it.
 */
export function currentPackageStart(rows: readonly PackageRow[], who: Who): Date | null {
  const current = rows
    .filter((r) => r.student_id === who.studentId && onBalance(r))
    .filter((r) => startOfLocalDay(r.starts_on, who.tz).getTime() <= who.at.getTime())
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0];
  return current ? startOf(current, who.tz) : null;
}

/** The lessons to hold now, in the order read. */
interface DueInput {
  lessons: readonly OpenEndedLesson[];
  packages: readonly PackageRow[];
  now: Date;
  /** settings.lesson_outcome_grace_minutes in ms (default AUTO_HELD_GRACE_MS). */
  graceMs?: number;
}

export function dueLessons(input: DueInput): OpenEndedLesson[] {
  const { packages, now, graceMs } = input;
  return input.lessons.filter((lesson) => {
    const packageStarts = lesson.lesson_students.map((ls) => {
      const tz = ls.student?.tz ?? 'UTC';
      return currentPackageStart(packages, { studentId: ls.student_id, tz, at: now });
    });
    const candidate = { status: lesson.status, ends_at: lesson.ends_at, packageStarts };
    return isAutoHeldDue(candidate, now, graceMs);
  });
}

/** Every student id on the lessons, each once. */
export const studentIdsOf = (lessons: readonly OpenEndedLesson[]): string[] => [
  ...new Set(lessons.flatMap((l) => l.lesson_students.map((ls) => ls.student_id))),
];
