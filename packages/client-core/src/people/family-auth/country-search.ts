import { asciiDigits, type Locale, matchesQuery } from '@ab/core';
import { COUNTRIES, type Country, nameOf, USUAL } from './countries.js';

/** «+٩٦٦», «966» → «966»: a search by calling code; anything else (a name) → null. */
function codeOf(query: string): string | null {
  const digits = asciiDigits(query).replace(/[\s+]/g, '');
  return /^[0-9]+$/.test(digits) ? digits : null;
}

/**
 * The picker's order: the phone's region, then the academy's usual countries, then every other
 * one alphabetically in the UI language.
 */
export function orderCountries(region: string | null, lang: Locale): Country[] {
  const top = [...new Set([region, ...USUAL])];
  const rank = (c: Country) => {
    const at = top.indexOf(c.code);
    return at === -1 ? top.length : at;
  };
  const collator = new Intl.Collator(lang);
  return [...COUNTRIES].sort(
    (a, b) => rank(a) - rank(b) || collator.compare(nameOf(a, lang), nameOf(b, lang)),
  );
}

/** The countries a search finds: by Arabic or English name, or by calling code (any digits). */
export function searchCountries(list: readonly Country[], query: string): Country[] {
  const code = codeOf(query);
  const found = (c: Country) =>
    code === null ? matchesQuery([c.ar, c.en], query) : c.dial.slice(1).startsWith(code);
  return list.filter(found);
}
