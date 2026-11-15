import { LOCALES, missingPlaceholders, type Locale, type TranslationKeyRow } from '@ab/shared';
import { editedOnValues } from './registry-hints';
import type { OverrideChange } from './translations.api';

// Pure side of the «الترجمات» editor: what a row shows, and which requests a save sends.

export const defaultOf = (row: TranslationKeyRow, locale: Locale): string => (locale === 'ar' ? row.ar : row.en);
export const overrideOf = (row: TranslationKeyRow, locale: Locale): string | null =>
  locale === 'ar' ? row.arOverride : row.enOverride;

/** What the UI shows today: the override when there is one, else the bundled text. */
export const effectiveText = (row: TranslationKeyRow, locale: Locale): string => overrideOf(row, locale) ?? defaultOf(row, locale);

export type Drafts = Record<Locale, string>;

export const draftsOf = (row: TranslationKeyRow): Drafts => ({ ar: effectiveText(row, 'ar'), en: effectiveText(row, 'en') });

/** The slots a draft dropped, per locale (nothing to save until they are back). */
export function draftProblems(row: TranslationKeyRow, drafts: Drafts): Partial<Record<Locale, string[]>> {
  const out: Partial<Record<Locale, string[]>> = {};
  for (const l of LOCALES) {
    if (editedOnValues(row.key, l)) continue;
    const missing = missingPlaceholders(defaultOf(row, l), drafts[l]);
    if (missing.length > 0) out[l] = missing;
  }
  return out;
}

/**
 * The requests «حفظ» sends: a PUT for each changed locale; typing the original text back over an
 * override is a restore (DELETE), so the row stops being «معدّل». Unchanged or blank: nothing. The
 * Arabic of a registry hint key is never sent (it is edited on «القيم»; the API refuses it, 409).
 */
export function changesFor(row: TranslationKeyRow, drafts: Drafts): OverrideChange[] {
  return LOCALES.flatMap((locale): OverrideChange[] => {
    if (editedOnValues(row.key, locale)) return [];
    const value = drafts[locale].trim();
    if (!value || value === effectiveText(row, locale).trim()) return [];
    if (value === defaultOf(row, locale).trim()) return [{ locale, key: row.key, value: null }];
    return [{ locale, key: row.key, value }];
  });
}
