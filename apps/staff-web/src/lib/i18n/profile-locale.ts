import { meLocaleSend } from '@ab/client-core';
import type { Locale } from '@ab/shared';
import { apiFetch, apiSend } from '@/lib/http/api';
import { supabase } from '@/lib/http/supabase';
import { locale, saveLocale, setLocale } from './locale';

// «اللغة» lives on the login (profiles.locale, owner 2026-11-16), on the staff pages and the
// family portal alike: after sign-in GET /auth/me's `locale` wins over this browser's saved copy,
// and the switch writes the profile first (PATCH /me/locale).

/** PATCH /me/locale. Built per call: the client's helpers are read when used, never at import. */
const sendLocale = (next: Locale) => meLocaleSend({ apiFetch, apiSend })(next);

/**
 * The login's language when this load shows another: saved, then a reload. Not when storage is
 * blocked: the reload would come back in this language and ask again, forever. True when reloading.
 */
export function followProfileLocale(profile: Locale | null): boolean {
  const differs = profile !== null && profile !== locale;
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
