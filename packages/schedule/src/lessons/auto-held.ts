import type { LessonStatus } from '@ab/catalog';
import { isOpenLesson } from './state-machine/index.js';

// Lessons need no confirmation by default: while the setting lesson_confirmation_required is OFF,
// a lesson still scheduled / confirmed AUTO_HELD_GRACE_MS after its end counts as held
// (→ completed, audit reason AUTO_HELD_REASON, actor null). The job never looks further back
// than AUTO_HELD_MAX_AGE_MS, nor before the start of a student's current package.

const MINUTE = 60_000;
export const AUTO_HELD_GRACE_MS = 30 * MINUTE;
export const AUTO_HELD_MAX_AGE_MS = 14 * 24 * 60 * MINUTE;
/** The audit `after.reason` of an automatic held mark, which also makes a lesson correctable. */
export const AUTO_HELD_REASON = 'auto_held';
/**
 * A correction's audit `after.reason`: an auto-held lesson marked cancelled by the teacher /
 * excused.
 */
export const AUTO_HELD_CORRECTION_REASON = 'auto_held_correction';

/** Lesson ends the job reads: [now − 14 days, now − grace] (lesson_outcome_grace_minutes). */
export function autoHeldWindow(
  now: Date,
  graceMs = AUTO_HELD_GRACE_MS,
): { from: Date; until: Date } {
  return {
    from: new Date(now.getTime() - AUTO_HELD_MAX_AGE_MS),
    until: new Date(now.getTime() - graceMs),
  };
}

export interface AutoHeldCandidate {
  status: LessonStatus;
  ends_at: string;
  /** Per student on the lesson: when their current package starts (null = none, e.g. a trial). */
  packageStarts: readonly (Date | null)[];
}

const inWindow = (endsAt: number, now: Date, graceMs: number): boolean => {
  const { from, until } = autoHeldWindow(now, graceMs);
  return endsAt >= from.getTime() && endsAt <= until.getTime();
};

const afterPackageStart =
  (endsAt: number) =>
  (start: Date | null): boolean =>
    start === null || endsAt >= start.getTime();

/** Due when still open, ended 30 min to 14 days ago, after every student's package start. */
export function isAutoHeldDue(
  lesson: AutoHeldCandidate,
  now: Date,
  graceMs = AUTO_HELD_GRACE_MS,
): boolean {
  const endsAt = Date.parse(lesson.ends_at);
  return (
    isOpenLesson(lesson.status) &&
    inWindow(endsAt, now, graceMs) &&
    lesson.packageStarts.every(afterPackageStart(endsAt))
  );
}

/** Shown only while settings.lesson_confirmation_required is on and status is `scheduled`. */
export function needsConfirmation(status: LessonStatus, required: boolean): boolean {
  return required && status === 'scheduled';
}
