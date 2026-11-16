import { meLocaleSend } from '@ab/client-core';
import { LOCALE_STORAGE_KEY, type Locale } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accessToken } from '../http/access-token';
import { apiFetch, apiSend } from '../http/api';
import { locale } from './locale';
import { setLocale } from './locale-switch';

// «اللغة» lives on the login (profiles.locale, owner 2026-11-16): the phone keeps a cached copy
// (LOCALE_STORAGE_KEY) only for the synchronous boot flag (locale-switch). After sign-in the API's
// answer wins; «اللغة» writes the profile first, then switches.

/** PATCH /me/locale. Built per call: the client's helpers are read when used, never at import. */
const sendLocale = (next: Locale) => meLocaleSend({ apiFetch, apiSend })(next);

async function cachedLocale(): Promise<string | null> {
  return AsyncStorage.getItem(LOCALE_STORAGE_KEY).catch(() => null);
}

/**
 * Switches to the profile's language when this run shows another (setLocale: save, reload). Not
 * when the cache already holds it: the boot gate has tried that language this run (a reload that
 * failed, or a native flag that did not stick), so asking again would loop. True when reloading.
 */
export async function followProfileLocale(
  profile: Locale | null,
  current: Locale = locale,
): Promise<boolean> {
  if (profile === null || profile === current) return false;
  if ((await cachedLocale()) === profile) return false;
  return (await setLocale(profile)) === 'reloading';
}

/** Signed in: PATCH /me/locale. Signed out (the sign-in screens) there is no profile to write. */
async function writeProfile(next: Locale): Promise<boolean> {
  try {
    if ((await accessToken()) !== null) await sendLocale(next);
    return true;
  } catch {
    return false;
  }
}

/**
 * «اللغة»: the profile first, then the phone (setLocale). A profile that could not be written
 * changes nothing ('error'): switching anyway would be undone by the next /auth/me
 * (followProfileLocale).
 */
export async function chooseLocale(next: Locale): Promise<Awaited<ReturnType<typeof setLocale>>> {
  return (await writeProfile(next)) ? setLocale(next) : 'error';
}
