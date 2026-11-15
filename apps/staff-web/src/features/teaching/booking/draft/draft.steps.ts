import type { BookingKind } from './contract';
import { days } from './draft.days';
import type { BookingDraft, StepKey } from './draft';
import { isNewStudent, newStudentReady } from '@/features/teaching/booking/steps/who/new-student';

// Which steps the booking wizard walks, and when «التالي» may leave each. Pure.

// The package (and lesson length) comes before the slot: the repeat days depend on it. A trial
// has no invoice; a makeup picks the missed lesson instead of a package.
const FLOWS: Record<BookingKind, readonly StepKey[]> = {
  trial: ['students', 'teacher', 'package', 'slot', 'review'],
  package: ['students', 'teacher', 'package', 'slot', 'invoice', 'review'],
  makeup: ['students', 'missed', 'teacher', 'slot', 'invoice', 'review'],
};
/** The assistant's course of a subscription: the student, package and length fixed, no invoice. */
const COURSE_FLOW: readonly StepKey[] = ['teacher', 'slot', 'review'];
/**
 * A new trial date for an existing student: the student is fixed, the length is the last trial's
 * and may change (the package step shows only the length for a trial; owner 2026-11-02).
 */
const TRIAL_DATE_FLOW: readonly StepKey[] = ['teacher', 'package', 'slot', 'review'];

export const stepsFor = (kind: BookingKind): readonly StepKey[] => FLOWS[kind];

/** The steps of this draft: the reduced flow when it books a subscription's course or a new trial date. */
export function stepsOf(d: Pick<BookingDraft, 'kind' | 'course' | 'trialDate'>): readonly StepKey[] {
  if (d.course) return COURSE_FLOW;
  return d.trialDate ? TRIAL_DATE_FLOW : FLOWS[d.kind];
}

/** A course needs exactly its days a week; any other booking one picked slot at least. */
function slotReady(d: BookingDraft): boolean {
  if (d.startsAt === null) return false;
  return !d.course || days(d).length === d.course.perWeek;
}

/** Whether «التالي» may leave `step`. */
export function stepReady(d: BookingDraft, step: StepKey): boolean {
  switch (step) {
    case 'students':
      if (d.kind === 'makeup') return d.students.length === 1 && !d.leadId;
      return isNewStudent(d) && d.students.length === 0 ? newStudentReady(d.newStudent) : d.students.length > 0;
    case 'missed':
      return d.missed !== null;
    case 'invoice':
      return d.invoice !== null;
    case 'teacher':
      return d.teacher !== null && d.teacher.has_availability;
    case 'slot':
      return slotReady(d);
    case 'package':
    case 'review':
      return true;
  }
}
