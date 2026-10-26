import { userChecks } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';

// The create / edit checks live in @ab/client-core (docs/27 E3), shared with the mobile app; this module injects `t`.
export const { emailError, nameError, phoneError, passwordError, createErrors, editErrors } = userChecks(() => ({
  validation: t.users.validation,
  phoneErrors: t.common.phoneErrors,
}));
export { createBody, type FieldKey, type FormErrors } from '@ab/client-core';
