import { joinError } from '@/classroom/links/join-text';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

/** A failed join in words: the API's refusal (its code), else «تعذّر الاتصال بالحلقة». */
export const roomFailure = (error: unknown): string =>
  error instanceof ApiError ? joinError(error) : t.classroom.error.connect_failed;
