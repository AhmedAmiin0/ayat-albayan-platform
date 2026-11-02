import type { LessonStatus } from '@ab/catalog';
import { isOpenLesson } from './state-machine.js';

// Owner 2026-11-02 («the default is that lessons are not requiring confirmation»): while the setting
// lesson_confirmation_required is OFF, a lesson still scheduled / confirmed AUTO_HELD_GRACE_MS after
// its end counts as held (→ completed, audit reason AUTO_HELD_REASON, actor null). The job never looks
// further back than AUTO_HELD_MAX_AGE_MS, nor before the start of a student's current package.

const MINUTE = 60_000;
export const AUTO_HELD_GRACE_MS = 30 * MINUTE;
export const AUTO_HELD_MAX_AGE_MS = 14 * 24 * 60 * MINUTE;
/** The audit row's `after.reason` of an automatic «انعقدت» (also what marks a lesson correctable). */
export const AUTO_HELD_REASON = 'auto_held';
/** A correction's audit `after.reason`: an auto-held lesson marked cancelled by the teacher / excused. */
export const AUTO_HELD_CORRECTION_REASON = 'auto_held_correction';

/** Lesson ends the job reads: [now − 14 days, now − 30 min]. */
export function autoHeldWindow(now: Date): { from: Date; until: Date } {
  return {
    from: new Date(now.getTime() - AUTO_HELD_MAX_AGE_MS),
    until: new Date(now.getTime() - AUTO_HELD_GRACE_MS),
  };
}

export interface AutoHeldCandidate {
  status: LessonStatus;
  ends_at: string;
  /** Per student on the lesson: when their current package starts (null = none, e.g. a trial). */
  packageStarts: readonly (Date | null)[];
}

const inWindow = (endsAt: number, now: Date): boolean => {
  const { from, until } = autoHeldWindow(now);
  return endsAt >= from.getTime() && endsAt <= until.getTime();
};

const afterPackageStart = (endsAt: number) => (start: Date | null): boolean =>
  start === null || endsAt >= start.getTime();

/**
 * Due for «انعقدت تلقائيًا»: still open (scheduled | confirmed; any other status is never touched),
 * ended at least 30 min and at most 14 days ago, and after every student's current package start.
 */
export function isAutoHeldDue(lesson: AutoHeldCandidate, now: Date): boolean {
  const endsAt = Date.parse(lesson.ends_at);
  return isOpenLesson(lesson.status) && inWindow(endsAt, now)
    && lesson.packageStarts.every(afterPackageStart(endsAt));
}

/**
 * «يحتاج تأكيد» is shown (web, mobile, counts, push) only while the academy requires a confirmation
 * (settings.lesson_confirmation_required) and the lesson is still `scheduled`.
 */
export function needsConfirmation(status: LessonStatus, required: boolean): boolean {
  return required && status === 'scheduled';
}
