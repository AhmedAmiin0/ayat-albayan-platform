import { normalizeStudentCode } from '@ab/shared';
import { asciiDigits } from '@ab/core';

/** Still on its way to a whole code («A», «AB», «AB-»): nothing to say yet. */
const PARTIAL = /^(A|AB|AB-)$/i;

/**
 * While the student code is typed (docs/50 §5: inline validation): true while it is, or may still
 * become, a student code (the server's own rule, normalizeStudentCode: any case, with or without
 * the dash, Arabic digits folded); false once it cannot (the app says what one looks like).
 */
export function studentCodeOnTrack(typed: string): boolean {
  const plain = asciiDigits(typed).replace(/\s/g, '');
  return normalizeStudentCode(plain) !== null || PARTIAL.test(plain);
}
