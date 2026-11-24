import { asciiDigits } from '@ab/core';

/** The WhatsApp sign-in code's length (docs/30 §1). */
export const CODE_LENGTH = 6;

/** Keeps digits only (Arabic and Persian folded), stripping pasted text, at most six. */
export const codeDigits = (raw: string): string =>
  asciiDigits(raw).replace(/\D/g, '').slice(0, CODE_LENGTH);

/** All six are in: the code goes to the API without a tap. */
export const isWholeCode = (code: string): boolean => code.length === CODE_LENGTH;
