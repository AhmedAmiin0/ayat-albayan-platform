import { meLocaleSend } from '@ab/client-core';
import { LOCALE_STORAGE_KEY, LOCALES, type Locale } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { accessToken } from '../http/access-token';
import { apiFetch, apiSend } from '../http/api';
import { locale } from './locale';
import { setLocale } from './locale-switch';

// «اللغة» lives on the login (profiles.locale, owner 2026-11-16): the phone keeps a cached copy
// (LOCALE_STORAGE_KEY) only for the synchronous boot flag (locale-switch). After sign-in the API's
// answer wins; «اللغة» writes the profile first, then switches.

/** PATCH /me/locale. Built per call: the client's helpers are read when used, never at import. */
const sendLocale = (next: Locale) => meLocaleSend({ apiFetch, apiSend })(next);

const cachedSchema = z.enum(LOCALES).nullable().catch(null);

/** The phone's saved «اللغة» choice; null when none (the phone's language) or unreadable. */
async function cachedLocale(): Promise<Locale | null> {
  return cachedSchema.parse(await AsyncStorage.getItem(LOCALE_STORAGE_KEY).catch(() => null));
}

/** Sent once per run: the profile learns the choice, a failure waits for the next run. */
let taught = false;

/**
 * A login that never chose (profile null) learns this phone's saved choice, once: PATCH it up.
 * Nothing saved (the phone's language) stays unset. Never switches.
 */
async function teachProfile(cached: Locale | null): Promise<false> {
  const send = cached !== null && !taught;
  taught = taught || send;
  if (send) await sendLocale(cached).catch(() => undefined);
  return false;
}

/**
 * The profile's language (null: never chosen, undefined: the answer has none). A choice that
 * differs from this run switches (setLocale: save, reload), unless the cache already holds it: the
 * boot gate has tried that language this run (a reload that failed, or a native flag that did not
 * stick), so asking again would loop. No choice yet: teachProfile. True when reloading.
 */
export async function followProfileLocale(
  profile: Locale | null | undefined,
  current: Locale = locale,
): Promise<boolean> {
  const cached = await cachedLocale();
  if (profile === null) return teachProfile(cached);
  const switching = profile !== undefined && profile !== current && cached !== profile;
  return switching && (await setLocale(profile)) === 'reloading';
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
