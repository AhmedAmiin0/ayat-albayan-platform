import { accountSetupSchema } from '@ab/shared';
import { z } from 'zod';
import { t } from '@/lib/i18n/i18n';
import { newPasswordProblem } from '@/features/people/auth/reset/reset-checks';

/** An API refusal's `code` (the ApiError body), parsed, never shape-checked by hand. */
const refusal = z.object({ body: z.object({ code: z.string() }) });

/** The words for PUT /me/setup's refusals (docs/46 A4); anything unknown is the generic error. */
export function setupErrorText(error: unknown): string {
  const parsed = refusal.safeParse(error);
  const code = parsed.success ? parsed.data.body.code : '';
  const words: Record<string, string> = {
    ...t.teacherAuth.setup.errors,
    password_too_short: t.users.errors.password_too_short,
    password_too_long: t.users.errors.password_too_long,
    password_blank: t.users.errors.password_blank,
  };
  return words[code] ?? t.common.error;
}

export interface SetupForm {
  email: string;
  password: string;
  confirm: string;
}

/** What is wrong with the typed form before it is sent (the API checks again), or undefined. */
export function setupFormProblem(form: SetupForm): string | undefined {
  const email = accountSetupSchema.shape.email.safeParse(form.email);
  if (!email.success) return t.teacherAuth.setup.errors.invalid_email;
  return newPasswordProblem(form.password, form.confirm);
}
