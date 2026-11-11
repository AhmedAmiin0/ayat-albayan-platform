import { z } from 'zod';
import { isFamilyEmail, PASSWORD_MAX } from '../users/index.js';

// A teacher's first-time setup (docs/46 A4): a teacher who signed in with a WhatsApp code holds a
// synthetic `t-<id>@family.invalid` login; before the portal opens she sets a real email and a
// password.

/** PUT /me/setup. The minimum length is the API's AUTH_PASSWORD_MIN_LENGTH (passwordProblem). */
export const accountSetupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('invalid_email').max(254))
    .refine((v) => !isFamilyEmail(v), 'invalid_email'),
  password: z.string().max(PASSWORD_MAX, 'password_too_long'),
});
export type AccountSetup = z.output<typeof accountSetupSchema>;

/** What /auth/me says that setup reads (web and mobile keep more fields). */
export interface SetupSubject {
  role: string | null;
  email?: string | null;
}

/** A teacher still on her code-made login: the portal waits for /account-setup («أكمل حسابك»). */
export const needsSetup = (me: SetupSubject | null | undefined): boolean =>
  me?.role === 'teacher' && isFamilyEmail(me.email);
