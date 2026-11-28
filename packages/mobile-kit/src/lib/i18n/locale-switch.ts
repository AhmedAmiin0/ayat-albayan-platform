import { LOCALE_STORAGE_KEY, parseLocale, type Locale } from '@ab/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { logWarning } from '../log/log';
import { locale } from './locale';

// The language a reload was last asked for. While starts still disagree with it (the native flag
// did not stick), the app opens as it is and keeps the marker: no reload loop, and no flip between
// the two languages on every other cold start. Cleared once a start shows the saved language.
export const RELOAD_KEY = 'ab.locale.reload';

/** Restarting now, saved but needing a manual restart, or nothing changed. */
type SwitchResult = 'reloading' | 'restart' | 'error';

/** Both native direction flags: RN's isRTL is forced || (allowed && the phone language is RTL). */
function persistDirection(of: Locale): void {
  const rtl = of === 'ar';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

/**
 * Persists `next`'s direction natively, then reloads the JS (an Arabic phone set to English needs
 * allow off too). A failed reload puts this run's direction back and drops the marker: the flags
 * are persisted, so leaving `next`'s would open the next cold start in a direction no gate chose,
 * with no marker to explain it (a mirrored layout under the other language's strings).
 * Returns whether a reload is under way.
 */
async function reloadInto(next: Locale, current: Locale): Promise<boolean> {
  persistDirection(next);
  try {
    await AsyncStorage.setItem(RELOAD_KEY, next);
    await reloadAppAsync();
    return true;
  } catch {
    persistDirection(current);
    await AsyncStorage.removeItem(RELOAD_KEY).catch(() => undefined);
    return false; // The gate (syncLocale) retries on the next cold start.
  }
}

/**
 * The phone's language, as WhatsApp reads it: an RTL phone opens in Arabic,
 * an LTR one in English. Never throws: no native module or no answer falls back to Arabic.
 */
export function phoneLocale(): Locale {
  try {
    return getLocales()[0].textDirection === 'ltr' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

/** A saved choice wins; otherwise follow the phone, reloading once if the native flag disagrees. */
export async function syncLocale(current: Locale = locale): Promise<boolean> {
  let saved: string | null;
  let pending: string | null;
  try {
    saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    pending = await AsyncStorage.getItem(RELOAD_KEY);
  } catch {
    return false; // Unreadable storage: keep this run's language rather than guess.
  }
  const wanted = saved !== null ? parseLocale(saved) : phoneLocale();
  if (wanted === current) {
    if (pending !== null) await AsyncStorage.removeItem(RELOAD_KEY).catch(() => undefined);
    return false;
  }
  if (pending !== wanted) return reloadInto(wanted, current);
  if (__DEV__) logWarning(`locale: the native direction did not switch to ${wanted}`);
  return false;
}

/** Not saved changes nothing (the gate would undo it); a failed reload applies on cold start. */
export async function setLocale(next: Locale): Promise<SwitchResult> {
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    return 'error';
  }
  return (await reloadInto(next, locale)) ? 'reloading' : 'restart';
}

/** app/_layout: false until the UI language matches the wanted one (or a reload is under way). */
export function useLocaleReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void syncLocale().then((reloading) => setReady(!reloading));
  }, []);
  return ready;
}
