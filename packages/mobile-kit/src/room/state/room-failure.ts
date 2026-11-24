import { apiErrorCode, ApiError } from '@ab/client-core';
import { t } from '../../lib/i18n/i18n';

const errors: Record<string, string | undefined> = t.classroom.error;

/** The API's `code`, else a generic problem text. */
export const classroomError = (error: unknown): string =>
  errors[apiErrorCode(error) ?? ''] ?? errors.unknown ?? t.common.error;

/** The API's refusal by code, else a generic connection failure. */
export const roomFailure = (error: unknown): string =>
  error instanceof ApiError ? classroomError(error) : t.classroom.error.connect_failed;
