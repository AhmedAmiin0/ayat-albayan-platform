import { defaultCountry, type Country } from '@ab/client-core';

/** The browser's region («ar-QA» → QA), the country a number starts in (Saudi Arabia else). */
export function browserCountry(language: string | undefined): Country {
  const region = language ? new Intl.Locale(language).maximize().region : undefined;
  return defaultCountry(region);
}
