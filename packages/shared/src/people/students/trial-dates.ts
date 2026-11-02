import type { Attendance, Gender, LessonStatus, Program, StudentStatus } from '@ab/catalog';
import { isCancelledLesson } from '../../schedule/lessons/index.js';
import { isNotSubscribed } from './status-flow.js';

// «موعد تجريبي جديد» (owner 2026-10-25): a new free-trial date for an existing student who has no
// running subscription, and the history of every trial time picked for them. Pure.

/**
 * What became of one picked trial time: قادمة (still ahead), بانتظار التقرير (its time passed, nothing
 * recorded yet), حضر, غاب, أُلغيت, نُقلت (a newer date replaced it: status rescheduled).
 */
export const TRIAL_OUTCOMES = ['upcoming', 'awaiting', 'attended', 'absent', 'cancelled', 'moved'] as const;
export type TrialOutcome = (typeof TRIAL_OUTCOMES)[number];

/** From this many dates on (the new one included) the form warns; never a block (owner 2026-10-25). */
export const TRIAL_DATE_WARN_FROM = 3;

/** One row of «مواعيد الحلقة التجريبية», newest pick first. Times are UTC instants. */
export interface TrialDateRow {
  lesson_id: string;
  starts_at: string;
  ends_at: string;
  teacher: { id: string; name: string } | null;
  outcome: TrialOutcome;
  /** Who picked it (lessons.created_by); null for imported rows. */
  picked_by: string | null;
  /** When it was picked (lessons.created_at). */
  picked_at: string;
  /** The older date this one replaced (lessons.rescheduled_from_id). */
  moved_from_id: string | null;
}

/** GET {base}/trial-dates?studentId= */
export interface TrialHistory {
  student_id: string;
  status: StudentStatus;
  /** The family's (guardian's) zone, shown next to the viewer's when they differ. */
  family_tz: string;
  /** A new date may be picked: the student has no running subscription (canPickTrialDate). */
  allowed: boolean;
  count: number;
  items: TrialDateRow[];
  /** The trial a new date would move: scheduled / confirmed and still ahead; null = a new lesson. */
  upcoming_id: string | null;
  /** What the wizard prefills (the teacher filters and the rule's zone); optional for older answers. */
  program?: Program;
  teacher_gender_pref?: Gender | null;
  student_tz?: string;
}

/** POST {base}/trial-date 201: the new trial lesson, and the one it moved (null = none was ahead). */
export interface TrialDateResult {
  lesson_id: string;
  starts_at: string;
  ends_at: string;
  teacher_id: string;
  moved_from_id: string | null;
}

/** new / trial / pending_subscription: a subscriber changes their course instead (409 trial_date_subscribed). */
export const canPickTrialDate = (status: StudentStatus | null | undefined): boolean => isNotSubscribed(status);

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
  if (OPEN.includes(status)) return Date.parse(input.starts_at) > input.now.getTime() ? 'upcoming' : 'awaiting';
  return 'attended';
}

/** The trial a new date moves: open and still ahead, the earliest of them. */
export function upcomingTrial<T extends { status: LessonStatus; starts_at: string }>(rows: readonly T[], now: Date): T | null {
  const ahead = rows.filter((r) => OPEN.includes(r.status) && Date.parse(r.starts_at) > now.getTime());
  return [...ahead].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0] ?? null;
}
