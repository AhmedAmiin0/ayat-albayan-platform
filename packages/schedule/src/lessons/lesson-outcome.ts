import type { LessonStatus } from '@ab/catalog';
import { AUTO_HELD_REASON } from './auto-held.js';
import { OPEN_LESSON_STATUSES } from './state-machine.js';

// Owner 2026-11-03 («leave the default status to confirm and leave the logic as is, but count it on
// used lessons, and if the student didn't reply after the reminder message mark him as absent»):
// while settings.lesson_confirmation_required is ON, the job settles a lesson only once it ended
// plus the grace (settings.lesson_outcome_grace_minutes), and only one that ended after the cutoff
// (lesson_outcomes_since(), the deploy of migration 999): never a retro change.

/** The audit row's `after.reason` of the job's «غائب» (the family never answered the reminder). */
export const AUTO_NO_SHOW_REASON = 'auto_no_show';
/** The audit `after.reason` of a staff «تصحيح الحالة» (POST …/lessons/:id/correct). */
export const OUTCOME_CORRECTION_REASON = 'outcome_correction';
/**
 * The audit `after.reason`s that keep a lesson correctable (LessonView.auto_held): the job's two
 * outcomes, and a staff correction (so a wrong pick can be corrected again).
 */
export const AUTO_OUTCOME_REASONS = [
  AUTO_HELD_REASON,
  AUTO_NO_SHOW_REASON,
  OUTCOME_CORRECTION_REASON,
] as const;

/** What staff may correct a lesson to (owner 2026-11-03), in button order. */
export const CORRECT_TO = [
  'completed',
  'no_show',
  'excused',
  'cancelled_by_teacher',
] as const satisfies readonly LessonStatus[];
export type CorrectTo = (typeof CORRECT_TO)[number];

/**
 * The job's verdict: completed (confirmed), no_show (reminded, no «نعم»), unresolved (no platform
 * reminder: stays «يحتاج تأكيد», counted, the assistant resolves it), wait (inside the grace), skip
 * (not open, or ended before the cutoff).
 */
export type OutcomeDecision = 'completed' | 'no_show' | 'unresolved' | 'wait' | 'skip';

export interface OutcomeLesson {
  status: LessonStatus;
  /** ISO instant (UTC or with an offset): times are compared as instants, never local clocks. */
  ends_at: string;
  /** The platform sent this lesson's family reminder (sent / delivered / read). */
  reminded: boolean;
}

export interface OutcomeClock {
  now: Date;
  graceMs: number;
  /** lesson_outcomes_since(): a lesson that ended before it is never touched. */
  since: Date;
}

type OpenStatus = 'scheduled' | 'confirmed';
const ON_OPEN: Record<OpenStatus, (reminded: boolean) => OutcomeDecision> = {
  confirmed: () => 'completed',
  scheduled: (reminded) => (reminded ? 'no_show' : 'unresolved'),
};

const OPEN: readonly LessonStatus[] = OPEN_LESSON_STATUSES;
const isOpen = (status: LessonStatus): status is OpenStatus => OPEN.includes(status);

/** Pure: which outcome the job writes for one lesson now (see OutcomeDecision). */
export function decideLessonOutcome(lesson: OutcomeLesson, clock: OutcomeClock): OutcomeDecision {
  const { status } = lesson;
  const endsAt = Date.parse(lesson.ends_at);
  if (!isOpen(status) || endsAt < clock.since.getTime()) return 'skip';
  const due = endsAt + clock.graceMs <= clock.now.getTime();
  return due ? ON_OPEN[status](lesson.reminded) : 'wait';
}

/** A lesson staff may correct: still open and ended, or settled by the job (auto). */
export interface CorrectableLesson {
  status: LessonStatus;
  ends_at: string;
  /** The job settled it and no report spoke since; undefined = unknown (the API decides). */
  auto?: boolean | undefined;
}

const isCorrectTo = (status: LessonStatus): status is CorrectTo =>
  (CORRECT_TO as readonly LessonStatus[]).includes(status);

/** Unknown (sales rows carry no flag): offered on the job's own outcomes, the API decides. */
const UNKNOWN_OFFERED: readonly LessonStatus[] = ['completed', 'no_show'];

const settledByJob = (lesson: CorrectableLesson): boolean =>
  lesson.auto === undefined
    ? UNKNOWN_OFFERED.includes(lesson.status)
    : lesson.auto && isCorrectTo(lesson.status);

const endedOpen = (lesson: CorrectableLesson, now: Date): boolean =>
  isOpen(lesson.status) && Date.parse(lesson.ends_at) <= now.getTime();

/** The statuses offered to correct to (never the current one); [] = no correction offered. */
export function correctionTargets(lesson: CorrectableLesson, now: Date): CorrectTo[] {
  const offered = endedOpen(lesson, now) || settledByJob(lesson);
  return offered ? CORRECT_TO.filter((to) => to !== lesson.status) : [];
}
