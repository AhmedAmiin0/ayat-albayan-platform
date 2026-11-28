import { userChecks } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

// The checks live in @ab/client-core (docs/27 E3), shared with the web app; this injects `t`.
export const { emailError, nameError, phoneError, passwordError, createErrors, editErrors } =
  userChecks(() => ({
    validation: t.users.validation,
    phoneErrors: t.common.phoneErrors,
  }));
export { createBody, type FieldKey, type FormErrors } from '@ab/client-core';
