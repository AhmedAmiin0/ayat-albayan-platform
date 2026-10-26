import type { Locale } from './locale.js';

/** A name an admin keeps in two languages (teachers.display_name_*, expense_categories.label_*). */
export interface LocalizedName {
  ar: string;
  en?: string | null;
}

/** The English name in the English UI when it is set (not blank); otherwise the Arabic one. */
export function localizedName(name: LocalizedName, locale: Locale): string {
  const en = name.en?.trim();
  return locale === 'en' && en ? en : name.ar;
}
