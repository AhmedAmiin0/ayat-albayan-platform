import { getLocales } from 'expo-localization';

// The country list and its rules (dial split, search, order) live in @ab/client-core, shared with
// the family web pages; the app adds only the phone's own region.
export { type Country, defaultCountry } from '@ab/client-core';

/** The phone's region («GB»), or null when the OS does not say. */
export const phoneRegion = (): string | null => getLocales().at(0)?.regionCode ?? null;
