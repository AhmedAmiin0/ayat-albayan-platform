import { meLocaleSend } from '@ab/client-core';
import { LOCALE_STORAGE_KEY, LOCALES, type Locale } from '@ab/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { accessToken } from '../http/access-token';
import { apiFetch, apiSend } from '../http/api';
import { locale } from './locale';
import { setLocale } from './locale-switch';

// Language lives on the login; the phone caches it only for the synchronous boot flag.

/** PATCH /me/locale. Built per call: the client's helpers are read when used, never at import. */
const sendLocale = (next: Locale) => meLocaleSend({ apiFetch, apiSend })(next);

const cachedSchema = z.enum(LOCALES).nullable().catch(null);

/** Null when none (follow the phone) or unreadable. */
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

/** A profile write failure changes nothing, since the next /auth/me would undo the switch. */
export async function chooseLocale(next: Locale): Promise<Awaited<ReturnType<typeof setLocale>>> {
  return (await writeProfile(next)) ? setLocale(next) : 'error';
}
