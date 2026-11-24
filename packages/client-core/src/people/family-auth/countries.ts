import { CountryListSchema, type CountryData, flagOf, type Locale } from '@ab/core';
import data from '@ab/shared/data/countries.json' with { type: 'json' };

export interface Country extends CountryData {
  /** 🇸🇦: from the ISO code, no image. */
  flag: string;
}

/** Every country with a calling code (one shared list, zod-checked as it is read). */
export const COUNTRIES: readonly Country[] = CountryListSchema.parse(data).map((c) => ({
  ...c,
  flag: flagOf(c.code),
}));

/** The academy's usual countries, after the device's own in the picker. */
export const USUAL = ['SA', 'EG', 'AE', 'QA', 'KW', 'OM', 'BH'] as const;

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
const countryByCode = (code: string | null | undefined): Country | undefined =>
  byCode.get((code ?? '').toUpperCase());

function listed(code: string): Country {
  const country = countryByCode(code);
  if (country === undefined) throw new Error(`countries.json has no ${code}`);
  return country;
}
const SAUDI = listed('SA');

/**
 * The country a number starts in: the device's region (the phone's locale, the browser's language
 * tag) when known, else Saudi Arabia.
 */
export function defaultCountry(region: string | null | undefined): Country {
  return countryByCode(region) ?? SAUDI;
}

/** The country's name in the UI language. */
export const nameOf = (country: CountryData, lang: Locale): string => country[lang];
