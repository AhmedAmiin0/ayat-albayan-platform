import { localeUpdateSchema, LOCALES, type Locale } from '@ab/shared';
import { z } from 'zod';
import type { ApiClient } from '../http/index.js';

// «اللغة» from the API (owner 2026-11-16), for web and both apps: GET /auth/me (staff) and GET
// /portal/me (family) answer profiles.locale; «اللغة» writes it back with PATCH /me/locale.

/** PATCH: the signed-in login's own language (any role, guardians and students too). */
export const meLocalePath = '/me/locale';

const answerLocale = z.object({ locale: z.enum(LOCALES) });

/** The `locale` of a /auth/me or /portal/me answer; null while loading, or from an older API. */
export function meLocaleOf(me: unknown): Locale | null {
  const parsed = answerLocale.safeParse(me);
  return parsed.success ? parsed.data.locale : null;
}

/** Writes the login's language; resolves with the stored one (parsed, rule 12). */
export const meLocaleSend =
  (client: ApiClient) =>
  async (locale: Locale): Promise<Locale> => {
    const body = localeUpdateSchema.parse({ locale });
    const answer = await client.apiSend<unknown>('PATCH', meLocalePath, body);
    return localeUpdateSchema.parse(answer).locale;
  };
