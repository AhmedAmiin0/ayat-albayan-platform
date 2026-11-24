import { meLocaleSend } from '@ab/client-core';
import { LOCALE_STORAGE_KEY, LOCALES, type Locale } from '@ab/core';
import { z } from 'zod';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import { supabase } from '@ab/web-kit/lib/http/supabase';
import { locale, saveLocale, setLocale } from './locale';

// The language lives on the login: GET /auth/me's `locale` wins over the browser copy.

/** PATCH /me/locale. Built per call: the client's helpers are read when used, never at import. */
const sendLocale = (next: Locale) => meLocaleSend({ apiFetch, apiSend })(next);

const savedSchema = z.enum(LOCALES).nullable().catch(null);

/** This browser's saved language; null when none (Arabic by default) or blocked. */
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

/** A failed profile write changes nothing, since the next /auth/me would switch straight back. */
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
