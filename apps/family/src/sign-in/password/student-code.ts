import { t } from '@ab/mobile-kit';

/** students.code: «AB-» and digits (rule 7: generated, never typed by staff), any letter case. */
const STUDENT_CODE = /^AB-\d{3,}$/i;
/** Still on its way to a whole code («A», «AB-», «AB-12»): nothing to say yet. */
const PARTIAL = /^(A|AB|AB-|AB-\d{1,2})$/i;

/**
 * While the student code is typed (docs/50 §5: inline validation): null while it is, or may still
 * become, a student code; else the line that says what one looks like.
 */
export function checkStudentCode(typed: string): string | null {
  const ok = STUDENT_CODE.test(typed) || PARTIAL.test(typed);
  return ok ? null : t.familyApp.signIn.studentCodeBad;
}
