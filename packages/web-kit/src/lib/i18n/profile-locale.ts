import { meLocaleSend } from '@ab/client-core';
import { LOCALE_STORAGE_KEY, LOCALES, type Locale } from '@ab/shared';
import { z } from 'zod';
import { apiFetch, apiSend, supabase } from '#/lib/http/index.ts';
import { locale, saveLocale, setLocale } from './locale';

// «اللغة» lives on the login (profiles.locale, owner 2026-11-16), on the staff pages and the
// family portal alike: after sign-in GET /auth/me's `locale` wins over this browser's saved copy,
// and the switch writes the profile first (PATCH /me/locale).

/** PATCH /me/locale. Built per call: the client's helpers are read when used, never at import. */
const sendLocale = (next: Locale) => meLocaleSend({ apiFetch, apiSend })(next);

const savedSchema = z.enum(LOCALES).nullable().catch(null);

/** This browser's saved «اللغة» choice; null when none (Arabic by default) or blocked. */
function savedChoice(): Locale | null {
  try {
    return savedSchema.parse(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Sent once per load: the profile learns the choice, a failure waits for the next load. */
let taught = false;

/** A login that never chose (null) learns this browser's saved choice, once. Never switches. */
function teachProfile(): false {
  const choice = taught ? null : savedChoice();
  taught = true;
  if (choice !== null) void sendLocale(choice).catch(() => undefined);
  return false;
}

/**
 * The login's language (null: never chosen, undefined: the answer has none). A choice this load
 * does not show: saved, then a reload; not when storage is blocked (the reload would come back in
 * this language and ask again, forever). No choice yet: teachProfile. True when reloading.
 */
export function followProfileLocale(profile: Locale | null | undefined): boolean {
  if (profile === null) return teachProfile();
  const differs = profile !== undefined && profile !== locale;
  const switching = differs && saveLocale(profile);
  if (switching) location.reload();
  return switching;
}

/**
 * «اللغة»: signed in, PATCH /me/locale first, then save and reload; signed out (a public page)
 * only the browser's copy. A profile that could not be written changes nothing (false): the next
 * /auth/me would switch straight back.
 */
export async function chooseLocale(next: Locale): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) await sendLocale(next);
  } catch {
    return false;
  }
  setLocale(next);
  return true;
}
