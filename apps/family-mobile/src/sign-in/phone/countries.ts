import { getLocales } from 'expo-localization';

/** The academy's countries (the API's phone list, @ab/core phone.ts, plus Bahrain). */
export type CountryCode = 'SA' | 'AE' | 'QA' | 'KW' | 'OM' | 'BH' | 'EG';

export interface Country {
  code: CountryCode;
  /** The calling code, «+966». */
  dial: string;
  /** National digits of a WhatsApp (mobile) number, without the leading 0. */
  digits: number;
  flag: string;
}

const SAUDI: Country = { code: 'SA', dial: '+966', digits: 9, flag: '🇸🇦' };

export const COUNTRIES: readonly Country[] = [
  SAUDI,
  { code: 'AE', dial: '+971', digits: 9, flag: '🇦🇪' },
  { code: 'QA', dial: '+974', digits: 8, flag: '🇶🇦' },
  { code: 'KW', dial: '+965', digits: 8, flag: '🇰🇼' },
  { code: 'OM', dial: '+968', digits: 8, flag: '🇴🇲' },
  { code: 'BH', dial: '+973', digits: 8, flag: '🇧🇭' },
  { code: 'EG', dial: '+20', digits: 10, flag: '🇪🇬' },
];

const byCode = (code: string | null | undefined) => COUNTRIES.find((c) => c.code === code);

/** The country a number starts in: the phone's region when it is one of ours, else Saudi Arabia. */
export function defaultCountry(region = getLocales().at(0)?.regionCode): Country {
  return byCode(region) ?? SAUDI;
}

/** For the picker: a country by code (an unknown code keeps the current one). */
export const countryOf = (code: CountryCode, current: Country): Country => byCode(code) ?? current;
