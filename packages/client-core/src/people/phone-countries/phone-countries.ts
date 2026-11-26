import { E164_RE } from '@ab/core';
import { COUNTRIES, type Country } from '../family-auth';

/** Each calling code once, the longest first, so +1268 is tried before the +1 it starts with. */
const DIALS = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);

/**
 * The countries a number is from, by its calling code: the longest code the number starts with.
 * Several countries share one code (+1, +7, +44) and the code alone cannot tell them apart, so
 * all of them come back, in the list's order. Anything but an E.164 number, or a code no country
 * in the list has, gives none.
 */
export function countriesOfPhone(phone: string): Country[] {
  const dial = E164_RE.test(phone) ? DIALS.find((d) => phone.startsWith(d)) : undefined;
  return COUNTRIES.filter((c) => c.dial === dial);
}
