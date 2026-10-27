import { userChecks } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';

const { passwordError } = userChecks(() => ({ validation: t.users.validation, phoneErrors: t.common.phoneErrors }));

/** What is wrong with the new password and its confirmation (the shared password rules), or undefined. */
export function newPasswordProblem(password: string, confirm: string): string | undefined {
  return passwordError(password) ?? (password === confirm ? undefined : t.familyAuth.passwordsDiffer);
}
