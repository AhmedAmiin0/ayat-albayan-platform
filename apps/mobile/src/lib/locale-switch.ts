import { LOCALE_STORAGE_KEY, parseLocale, type Locale } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { locale } from './locale';

// The language a reload was last asked for. If the next start still disagrees (the native flag did
// not stick), the app opens as it is instead of reloading forever.
export const RELOAD_KEY = 'ab.locale.reload';

/**
 * Persists `next`'s direction natively, then reloads the JS. Both flags: RN's isRTL is
 * forced || (allowed && phone language is RTL), so an Arabic phone set to English needs allow off.
 * Returns whether a reload is under way.
 */
async function reloadInto(next: Locale): Promise<boolean> {
  const rtl = next === 'ar';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  try {
    await AsyncStorage.setItem(RELOAD_KEY, next);
    await reloadAppAsync();
    return true;
  } catch {
    return false; // The flags are saved: the next cold start opens in `next`.
  }
}

/**
 * Boot gate: true while reloading into the saved language (render nothing), false when this run
 * already shows it. Nothing saved = Arabic, so a first start on an LTR phone reloads once.
 */
export async function syncLocale(current: Locale = locale): Promise<boolean> {
  let saved: string | null;
  let pending: string | null;
  try {
    saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    pending = await AsyncStorage.getItem(RELOAD_KEY);
  } catch {
    return false; // Unreadable storage: keep this run's language rather than guess.
  }
  const wanted = parseLocale(saved);
  if (wanted !== current && pending !== wanted) return reloadInto(wanted);
  if (pending !== null) await AsyncStorage.removeItem(RELOAD_KEY).catch(() => undefined);
  return false;
}

/** «اللغة»: saves the choice and restarts in it. Not saved → nothing changes (the gate would undo it). */
export async function setLocale(next: Locale): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    return;
  }
  await reloadInto(next);
}

/** app/_layout: false until the UI language matches the saved one (or a reload is under way). */
export function useLocaleReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void syncLocale().then((reloading) => setReady(!reloading));
  }, []);
  return ready;
}
