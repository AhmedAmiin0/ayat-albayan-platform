import type { Locale } from '@ab/core';

/** ar.json / en.json `inbox.quote`. */
export interface PhoneCountryWords {
  /** Carries `{country}` and `{code}`. */
  clientCountry: string;
  /** The word between the names of a shared code. */
  countryJoin: string;
}

export interface PhoneCountryLineOptions {
  /** The UI language: the line is for the staff member, not for the client. */
  lang: Locale;
  words: PhoneCountryWords;
  /** Isolates the code in a right-to-left line (each app's own ltr()); default: as it is. */
  wrap?: (code: string) => string;
}
