// R-ASST-01: a renewal opens on the continue step, else teacher, days, review. Pure.

export type CourseStep = 'continue' | 'teacher' | 'slot' | 'confirm';

/** The continue step counts as the first. */
export const COURSE_STEPS: readonly CourseStep[] = ['teacher', 'slot', 'confirm'];

interface StepState {
  step: CourseStep;
  same: boolean;
  renewal: boolean;
}

export const firstStep = (renewal: boolean): CourseStep => (renewal ? 'continue' : 'teacher');

/** Null means leaving the wizard. */
export function stepBack({ step, same, renewal }: StepState): CourseStep | null {
  if (step === 'continue') return null;
  if (step === 'teacher') return renewal ? 'continue' : null;
  if (same) return 'continue';
  return step === 'confirm' ? 'slot' : 'teacher';
}

export const stepNumber = (step: CourseStep): number => Math.max(0, COURSE_STEPS.indexOf(step)) + 1;
