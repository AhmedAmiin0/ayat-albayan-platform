import { asciiDigits } from '@ab/core';

/** The WhatsApp sign-in code's length (docs/30 §1). */
export const CODE_LENGTH = 6;

/**
 * What the code boxes hold after a keystroke, a paste or the OS's autofill: digits only (Arabic and
 * Persian ones folded, «123 456» or «رمزك: 123456» from WhatsApp's «copy code» reduced to the
 * digits), at most six.
 */
export const codeDigits = (raw: string): string =>
  asciiDigits(raw).replace(/\D/g, '').slice(0, CODE_LENGTH);

/** All six are in: the code goes to the API without a tap. */
export const isWholeCode = (code: string): boolean => code.length === CODE_LENGTH;
