import { asciiDigits, normalizePhone } from '@ab/shared';
import type { Country } from './countries.js';

/** empty: nothing typed; typing: too short to judge; ok: a WhatsApp number; bad: cannot be. */
export type PhoneState = 'empty' | 'typing' | 'ok' | 'bad';

export interface PhoneCheck {
  state: PhoneState;
  /** The number to send (E.164) once `ok`, else null. */
  e164: string | null;
}

/** Shortest whole international number we judge (+ and 8 digits, the E.164 floor). */
const MIN_INTERNATIONAL = 8;

const digitsOf = (typed: string) => asciiDigits(typed).replace(/\D/g, '');
/** Typed with «+» or «00»: a whole international number, the picker is ignored. */
const isInternational = (typed: string) => /^\s*(\+|00)/.test(asciiDigits(typed));

function judge(e164: string, enough: boolean): PhoneCheck {
  const parsed = normalizePhone(e164);
  if (parsed.ok) return { state: 'ok', e164: parsed.e164 };
  return { state: enough ? 'bad' : 'typing', e164: null };
}

/**
 * The number field while it is typed (docs/50 §4: E.164, a country picker, inline validation):
 * the national number in the picked country (a leading 0 dropped: «05…» → «+9665…»), or a
 * whole number typed with + / 00. «typing» until it is long enough to say it is wrong.
 */
export function checkPhone(country: Country, typed: string): PhoneCheck {
  const digits = digitsOf(typed);
  if (digits === '') return { state: 'empty', e164: null };
  if (isInternational(typed)) {
    const whole = digits.replace(/^00/, '');
    return judge(`+${whole}`, whole.length >= MIN_INTERNATIONAL);
  }
  const national = digits.replace(/^0/, '');
  const whole = national.length >= country.digits;
  // Short of the country's length it is never «ok», even where E.164 alone would pass (BH).
  return whole ? judge(`${country.dial}${national}`, true) : { state: 'typing', e164: null };
}
