// UI language (Phase 7). The web defaults to Arabic RTL (DEFAULT_LOCALE); the mobile app follows the
// phone when nothing is saved (locale-switch). Either way the choice only changes the screens.
// Parent-facing output (report PDFs, WhatsApp, exports, push) stays Arabic.
// Digits stay Western in both languages (rule 10), hence -u-nu-latn on every Intl locale.

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';
/** localStorage (web) / AsyncStorage (mobile) key of the saved choice. */
export const LOCALE_STORAGE_KEY = 'ab.locale';

/** A saved value back to a Locale; anything unknown, or nothing saved, is the Arabic default. */
export function parseLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}

/** The Intl locale for dates, times and numbers in this UI language. */
export function intlLocale(locale: Locale): string {
  return locale === 'en' ? 'en-GB-u-nu-latn' : 'ar-EG-u-nu-latn';
}

export function localeDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
