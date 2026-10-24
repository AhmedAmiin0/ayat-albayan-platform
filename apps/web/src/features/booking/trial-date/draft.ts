import type { Gender, Program, TrialHistory } from '@ab/shared';
import { emptyDraft, type BookingDraft, type PickedStudent } from '../draft';
import type { BookHint } from '../hint';

// The booking wizard's draft for «موعد تجريبي جديد» (owner 2026-10-25): one trial lesson for one
// existing student, in the family's zone, through the reduced flow teacher → slot → review. Pure.

/** What the caller knows of the student besides the history (the admin's profile; sales: nothing). */
export interface TrialStudentFacts {
  program?: Program | undefined;
  genderPref?: Gender | null | undefined;
  /** The student's own zone; else the family's (history.family_tz). */
  tz?: string | undefined;
}

export interface TrialDraftInput {
  student: PickedStudent;
  history: TrialHistory;
  facts?: TrialStudentFacts | undefined;
}

/** The upcoming trial a new date would move (history.upcoming_id), else null. */
export const upcomingRow = (history: TrialHistory) =>
  history.upcoming_id ? (history.items.find((r) => r.lesson_id === history.upcoming_id) ?? null) : null;

/** The wizard's starting draft: a trial for this one student; the API moves the upcoming trial. */
export function trialDateDraft({ student, history, facts = {} }: TrialDraftInput): BookingDraft {
  return {
    ...emptyDraft({ kind: 'trial' }),
    students: [student],
    tz: facts.tz ?? history.family_tz,
    program: facts.program ?? 'quran',
    genderPref: facts.genderPref ?? null,
    trialDate: { upcomingId: history.upcoming_id, upcomingAt: upcomingRow(history)?.starts_at ?? null, count: history.count },
  };
}

/** The last trial's teacher (newest pick first), preselected on the teacher step and changeable. */
export function trialHint(history: TrialHistory): BookHint | null {
  const id = history.items[0]?.teacher?.id;
  return id ? { teacherId: id, startsAt: null } : null;
}
