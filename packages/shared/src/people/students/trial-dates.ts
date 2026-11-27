import {
  DURATIONS,
  type Attendance,
  type Duration,
  type LessonStatus,
  type StudentStatus,
} from '@ab/catalog';
import { isCancelledLesson } from '@ab/schedule';
import { isNotSubscribed } from './status-flow';
import type { TrialHistory, TrialOutcome } from './trial-date';

// A new free trial for a student with no running subscription, and the trial history; pure.

/** From this many dates on (the new one included) the form warns; never a block. */
export const TRIAL_DATE_WARN_FROM = 3;

/** new / trial / pending_subscription: a subscriber changes their course instead (409 trial_date_subscribed). */
export const canPickTrialDate = (status: StudentStatus | null | undefined): boolean =>
  isNotSubscribed(status);

/** The form warns from the 3rd date on: `count` dates exist already, the new one is count + 1. */
export const warnsTrialDate = (count: number): boolean => count + 1 >= TRIAL_DATE_WARN_FROM;

const OPEN: readonly LessonStatus[] = ['scheduled', 'confirmed'];
const MISSED_STATUS: readonly LessonStatus[] = ['no_show', 'excused'];
const MISSED: readonly (Attendance | null)[] = ['absent', 'excused'];

export interface TrialOutcomeInput {
  status: LessonStatus;
  /** This student's attendance on it (lesson_students.attendance). */
  attendance: Attendance | null;
  starts_at: string;
  now: Date;
}

/** A trial lesson's outcome for one student. */
export function trialOutcome(input: TrialOutcomeInput): TrialOutcome {
  const { status, attendance } = input;
  if (status === 'rescheduled') return 'moved';
  if (isCancelledLesson(status)) return 'cancelled';
  if (MISSED_STATUS.includes(status) || MISSED.includes(attendance)) return 'absent';
  if (OPEN.includes(status))
    return Date.parse(input.starts_at) > input.now.getTime() ? 'upcoming' : 'awaiting';
  return 'attended';
}

/** The trial a new date moves: open and still ahead, the earliest of them. */
export function upcomingTrial<T extends { status: LessonStatus; starts_at: string }>(
  rows: readonly T[],
  now: Date,
): T | null {
  const ahead = rows.filter(
    (r) => OPEN.includes(r.status) && Date.parse(r.starts_at) > now.getTime(),
  );
  return [...ahead].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0] ?? null;
}

/** A trial's length when the wizard has none of its own: the booking's 45 minutes. */
export const TRIAL_DEFAULT_MINUTES: Duration = 45;

/** Keeps the last trial's length when the slots offer it (30/45/60/90), else 45. */
export function trialLength(history: Pick<TrialHistory, 'items'>): Duration {
  const last = history.items[0];
  const ms = last ? Date.parse(last.ends_at) - Date.parse(last.starts_at) : 0;
  const min = Math.round(ms / 60_000);
  return DURATIONS.find((d) => d === min) ?? TRIAL_DEFAULT_MINUTES;
}
