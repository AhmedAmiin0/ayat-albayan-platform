import type { SubmitEvent } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const BOX_ERRORS = new Set([t.familyAuth.errors.invalid_code, t.familyAuth.errors.code_incomplete]);

/** The boxes turn red only for a wrong or short code, not for a network or rate error. */
export const isBoxError = (error: string | undefined): boolean =>
  error !== undefined && BOX_ERRORS.has(error);

/** The form never navigates: the step submits through `onSubmit`. */
export const submitWith = (onSubmit: () => void) => (e: SubmitEvent<HTMLFormElement>) => {
  e.preventDefault();
  onSubmit();
};
