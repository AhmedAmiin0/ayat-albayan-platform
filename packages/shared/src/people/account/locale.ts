import { LOCALES } from '@ab/core';
import { z } from 'zod';

// «اللغة» from the API: profiles.locale is the login's language on every app.
// PATCH /me/locale writes it (any signed-in user, their own login); GET /auth/me and GET /portal/me
// answer it, and the apps switch when it differs from the running one.

/** PATCH /me/locale: the body, and the answer. */
export const localeUpdateSchema = z.object({ locale: z.enum(LOCALES) }).strict();
export type LocaleUpdate = z.infer<typeof localeUpdateSchema>;
