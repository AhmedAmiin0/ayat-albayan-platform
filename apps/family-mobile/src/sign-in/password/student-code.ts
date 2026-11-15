import { asciiDigits, normalizeStudentCode } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** Still on its way to a whole code («A», «AB», «AB-»): nothing to say yet. */
const PARTIAL = /^(A|AB|AB-)$/i;

/**
 * While the student code is typed (docs/50 §5: inline validation): null while it is, or may still
 * become, a student code (the server's own rule, normalizeStudentCode: any case, with or without
 * the dash, Arabic digits folded); else the line that says what one looks like.
 */
export function checkStudentCode(typed: string): string | null {
  const plain = asciiDigits(typed).replace(/\s/g, '');
  const ok = normalizeStudentCode(plain) !== null || PARTIAL.test(plain);
  return ok ? null : t.familyApp.signIn.studentCodeBad;
}
