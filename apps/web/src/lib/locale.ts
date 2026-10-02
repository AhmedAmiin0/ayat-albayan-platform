import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, parseLocale, type Locale } from '@ab/shared';

// UI language (Phase 7), read ONCE at boot: `t` and the Intl formatters capture it at module
// level, so a switch saves the choice and reloads instead of re-rendering. Arabic is the default.

function readLocale(): Locale {
  try {
    return parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE; // storage blocked (private mode): Arabic
  }
}

export const locale: Locale = readLocale();

/** Saves the choice and reloads, so every string and format comes up in `next`. */
export function setLocale(next: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    // storage blocked: the reload keeps the current language
  }
  location.reload();
}
