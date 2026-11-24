import { LOCALES, type Locale } from '@ab/core';
import { missingPlaceholders, type TranslationKeyRow } from '@ab/i18n';
import { editedOnValues } from './registry-hints';
import type { OverrideChange } from './translations.api';

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

/** Typing the original back is a restore (DELETE); Arabic registry hints are never sent (409). */
export function changesFor(row: TranslationKeyRow, drafts: Drafts): OverrideChange[] {
  return LOCALES.flatMap((locale): OverrideChange[] => {
    if (editedOnValues(row.key, locale)) return [];
    const value = drafts[locale].trim();
    if (!value || value === effectiveText(row, locale).trim()) return [];
    if (value === defaultOf(row, locale).trim()) return [{ locale, key: row.key, value: null }];
    return [{ locale, key: row.key, value }];
  });
}
