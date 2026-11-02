// The course wizard's steps (R-ASST-01, owner 2026-10-18): a renewal opens on «تابِع بنفس الأيام»
// (the previous course's days); otherwise, or on «اختر أيامًا أخرى», المعلم/ة → الأيام → المراجعة. Pure.

export type CourseStep = 'continue' | 'teacher' | 'slot' | 'confirm';

/** The numbered steps («الخطوة 1 من 3»); «تابِع بنفس الأيام» counts as the first. */
export const COURSE_STEPS: readonly CourseStep[] = ['teacher', 'slot', 'confirm'];

interface StepState {
  step: CourseStep;
  /** The previous course's days were taken («تابِع بنفس الأيام»): the teacher step was skipped. */
  same: boolean;
  /** The view has a previous course: the wizard opens on «تابِع بنفس الأيام». */
  renewal: boolean;
}

export const firstStep = (renewal: boolean): CourseStep => (renewal ? 'continue' : 'teacher');

/** Where «رجوع» goes from a step; null = out of the wizard. */
export function stepBack({ step, same, renewal }: StepState): CourseStep | null {
  if (step === 'continue') return null;
  if (step === 'teacher') return renewal ? 'continue' : null;
  if (same) return 'continue';
  return step === 'confirm' ? 'slot' : 'teacher';
}

/** «الخطوة n من 3». */
export const stepNumber = (step: CourseStep): number => Math.max(0, COURSE_STEPS.indexOf(step)) + 1;
