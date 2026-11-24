import { LOCALES } from '@ab/core';
import { z } from 'zod';

// profiles.locale is the login's language on every app; the apps switch when it differs.

/** PATCH /me/locale: the body, and the answer. */
export const localeUpdateSchema = z.object({ locale: z.enum(LOCALES) }).strict();
export type LocaleUpdate = z.infer<typeof localeUpdateSchema>;
