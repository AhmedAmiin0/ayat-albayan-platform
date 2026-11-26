import { type Country, nameOf } from '../family-auth';
import { countriesOfPhone } from './phone-countries';
import type { PhoneCountryLineOptions } from './phone-countries.types';

const unwrapped = (code: string): string => code;

/** One country shows its flag; two that share a code are joined by name. */
function namesOf(countries: readonly Country[], o: PhoneCountryLineOptions): string {
  const [only] = countries;
  if (only !== undefined && countries.length === 1) return `${only.flag} ${nameOf(only, o.lang)}`;
  return countries.map((c) => nameOf(c, o.lang)).join(` ${o.words.countryJoin} `);
}

/**
 * The quote sheet's line saying where the chat's number is from, in the UI language; null when
 * the code is unknown, so the sheet shows nothing. Information only: the country the prices use
 * is still the staff member's choice.
 */
export function phoneCountryLine(phone: string, o: PhoneCountryLineOptions): string | null {
  const countries = countriesOfPhone(phone);
  const dial = countries[0]?.dial;
  if (dial === undefined) return null;
  const code = (o.wrap ?? unwrapped)(dial);
  const names = namesOf(countries, o);
  return o.words.clientCountry.replace('{country}', () => names).replace('{code}', () => code);
}
