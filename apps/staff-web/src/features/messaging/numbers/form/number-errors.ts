import { isNumberError, type NumberError } from '@ab/shared';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** The 409 code the numbers API answers (`{ message: 'phone_taken' }`), when it is one of ours. */
export function numberErrorCode(error: unknown): NumberError | null {
  if (!(error instanceof ApiError)) return null;
  const { body } = error;
  if (typeof body !== 'object' || body === null || !('message' in body)) return null;
  return isNumberError(body.message) ? body.message : null;
}

export function numberErrorText(error: unknown): string {
  const code = numberErrorCode(error);
  return code ? t.numbers.errors[code] : t.numbers.errors.generic;
}
