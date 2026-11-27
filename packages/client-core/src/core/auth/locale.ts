import { accountRoutes } from '@ab/shared';
import { LOCALES, type Locale } from '@ab/core';
import { z } from 'zod';
import { callWith, type ApiClient } from '../http';

// Locale comes from GET /auth/me or GET /portal/me and is written back with PATCH /me/locale.

/** PATCH: the signed-in login's own language (any role, guardians and students too). */
export const meLocalePath = accountRoutes.locale.path;

const answerLocale = z.object({ locale: z.enum(LOCALES).nullable() });

/**
 * The `locale` of a /auth/me or /portal/me answer: the login's choice, null when it never chose
 * one (the app then teaches it the device's choice), undefined when the answer has none (loading,
 * an older API, an unknown language).
 */
export function meLocaleOf(me: unknown): Locale | null | undefined {
  const parsed = answerLocale.safeParse(me);
  return parsed.success ? parsed.data.locale : undefined;
}

/** Writes the login's language; resolves with the stored one (parsed, rule 12). */
export const meLocaleSend =
  (client: ApiClient) =>
  async (locale: Locale): Promise<Locale> => {
    const answer = await callWith(client)({ route: accountRoutes.locale, body: { locale } });
    return answer.locale;
  };
