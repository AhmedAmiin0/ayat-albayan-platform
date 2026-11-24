import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, parseLocale, type Locale } from '@ab/core';

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

/** Saves the choice for the next load; false when the browser blocks storage (private mode). */
export function saveLocale(next: Locale): boolean {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    return true;
  } catch {
    return false;
  }
}

/** Saves the choice and reloads, so every string and format comes up in `next`. */
export function setLocale(next: Locale): void {
  saveLocale(next); // storage blocked: the reload keeps the current language
  location.reload();
}
