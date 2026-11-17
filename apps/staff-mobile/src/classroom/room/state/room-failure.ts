import { apiErrorCode, ApiError } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

const errors: Record<string, string | undefined> = t.classroom.error;

/** A classroom refusal in words: the API's `code` (classroom.error), else «حدثت مشكلة». */
export const classroomError = (error: unknown): string =>
  errors[apiErrorCode(error) ?? ''] ?? errors['unknown'] ?? t.common.error;

/** A failed join in words: the API's refusal (its code), else «تعذّر الاتصال بالحلقة». */
export const roomFailure = (error: unknown): string =>
  error instanceof ApiError ? classroomError(error) : t.classroom.error.connect_failed;
