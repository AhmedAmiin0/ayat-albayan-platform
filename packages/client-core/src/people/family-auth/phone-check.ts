import { asciiDigits, normalizePhone } from '@ab/core';
import type { Country } from './countries';
// Typed with + / 00: the picked country is ignored (the paste split's own rule).
import { isInternational } from './country-dial';

/** empty: nothing typed; typing: too short to judge; ok: a WhatsApp number; bad: cannot be. */
export type PhoneState = 'empty' | 'typing' | 'ok' | 'bad';

export interface PhoneCheck {
  state: PhoneState;
  /** The number to send (E.164) once `ok`, else null. */
  e164: string | null;
}

/** E.164: at most 15 digits after the «+». */
const E164_MAX = 15;
const EMPTY: PhoneCheck = { state: 'empty', e164: null };

/** Can more digits still make it a number the API takes? 0-padded: the rules are digit classes. */
function canGrow(e164: string): boolean {
  const room = Math.max(0, E164_MAX - (e164.length - 1));
  const longer = Array.from({ length: room + 1 }, (_, k) => `${e164}${'0'.repeat(k)}`);
  return longer.some((n) => normalizePhone(n).ok);
}

/** The API's own rule (@ab/core normalizePhone), so the field and the server never disagree. */
function judge(e164: string): PhoneCheck {
  const parsed = normalizePhone(e164);
  if (parsed.ok) return { state: 'ok', e164: parsed.e164 };
  return { state: canGrow(e164) ? 'typing' : 'bad', e164: null };
}

/**
 * The number field while it is typed (docs/50 §4: E.164, a country picker, inline validation):
 * the national number in the picked country (a leading 0 dropped: «05…» → «+9665…»), or a
 * whole number typed with + / 00. «typing» while more digits could still make it right.
 */
export function checkPhone(country: Country, typed: string): PhoneCheck {
  const digits = asciiDigits(typed).replace(/\D/g, '');
  if (digits === '') return EMPTY;
  const whole = isInternational(typed)
    ? `+${digits.replace(/^00/, '')}`
    : `${country.dial}${digits.replace(/^0/, '')}`;
  return judge(whole);
}
