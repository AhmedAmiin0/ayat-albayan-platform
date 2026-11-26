import { E164_RE } from '@ab/core';
import { COUNTRIES, mainCountryOf, type Country } from '../family-auth';

/** Each calling code once, the longest first, so +1268 is tried before the +1 it starts with. */
const DIALS = [...new Set(COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/**
 * The codes two full countries share, the larger first: the code alone cannot tell them apart.
 * Every other shared code is one country and its territories (+44: Guernsey, Jersey, the Isle of
 * Man), and naming those would bury the country a client is almost always from.
 */
const PEERS = new Map([
  ['+1', ['US', 'CA']],
  ['+7', ['RU', 'KZ']],
]);

/** The countries a calling code names: its peers, or else its main country alone. */
function namedBy(dial: string): Country[] {
  const peers = (PEERS.get(dial) ?? []).flatMap((code) => BY_CODE.get(code) ?? []);
  const main = mainCountryOf(dial);
  return peers.length === 0 && main !== undefined ? [main] : peers;
}

/**
 * The countries a number is from, by its calling code: the longest code the number starts with.
 * Anything but an E.164 number, or a code no country in the list has, gives none.
 */
export function countriesOfPhone(phone: string): Country[] {
  const dial = E164_RE.test(phone) ? DIALS.find((d) => phone.startsWith(d)) : undefined;
  return dial === undefined ? [] : namedBy(dial);
}
