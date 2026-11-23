import type { Locale } from '../locale.js';
import type { LocalizedName } from './localized-name.types.js';

/** A blank English name counts as missing, so the English UI falls back to Arabic. */
export function localizedName(name: LocalizedName, locale: Locale): string {
  const en = name.en?.trim();
  return locale === 'en' && en ? en : name.ar;
}
