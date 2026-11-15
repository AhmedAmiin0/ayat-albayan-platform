import { LOGIN_CODE_LENGTH, asciiDigits } from '@ab/shared';

// The 6-box code input's rules (docs/30 §7), kept pure so they are unit-tested apart from the DOM.

export const emptyCode = (): string[] => Array.from({ length: LOGIN_CODE_LENGTH }, () => '');

/** The ASCII digits of a typed or pasted text: Arabic-Indic and Persian digits fold, anything else drops. */
export function digitsOf(raw: string): string[] {
  return asciiDigits(raw).replace(/\D/g, '').split('').filter(Boolean);
}

/** The full code once every box holds a digit, else null. */
export function codeOf(boxes: readonly string[]): string | null {
  const code = boxes.join('');
  return code.length === LOGIN_CODE_LENGTH && /^\d+$/.test(code) ? code : null;
}

export interface BoxesState {
  boxes: string[];
  focus: number;
}

const last = LOGIN_CODE_LENGTH - 1;

/**
 * Text typed or pasted into box `at`. A whole code fills every box wherever it lands; a digit typed over
 * a filled box replaces it; several digits spill into the next boxes; nothing clears the box.
 */
export function typeInto(boxes: readonly string[], at: number, raw: string): BoxesState {
  let digits = digitsOf(raw);
  if (digits.length >= LOGIN_CODE_LENGTH) return { boxes: digits.slice(0, LOGIN_CODE_LENGTH), focus: last };
  const next = [...boxes];
  if (digits.length === 0) {
    next[at] = '';
    return { boxes: next, focus: at };
  }
  if (digits.length > 1 && digits[0] === boxes[at]) digits = digits.slice(1);
  digits.forEach((d, k) => {
    if (at + k <= last) next[at + k] = d;
  });
  return { boxes: next, focus: Math.min(at + digits.length, last) };
}

/**
 * A key on box `at` (the boxes are always laid out left to right): arrows, Home and End move;
 * Backspace on an empty box clears the one before and moves there. null = the browser's default.
 */
export function keyStep(key: string, at: number, boxes: readonly string[]): BoxesState | null {
  const move = (focus: number): BoxesState => ({ boxes: [...boxes], focus: Math.max(0, Math.min(focus, last)) });
  if (key === 'ArrowLeft') return move(at - 1);
  if (key === 'ArrowRight') return move(at + 1);
  if (key === 'Home') return move(0);
  if (key === 'End') return move(last);
  if (key !== 'Backspace' || boxes[at] !== '' || at === 0) return null;
  const next = [...boxes];
  next[at - 1] = '';
  return { boxes: next, focus: at - 1 };
}
