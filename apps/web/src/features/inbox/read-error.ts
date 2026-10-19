import { errorCode } from '@/features/schedule/api';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';

const ERRORS: Record<string, string | undefined> = t.inbox.error;

/**
 * A failed thread load in words: the API's reason when it has one (403 not_your_thread…); a bare
 * 403 is about reading the chat, never «غير مسموح لك بالإرسال»; anything else the generic error.
 */
export function readErrorText(error: unknown): string {
  const known = ERRORS[errorCode(error) ?? ''];
  if (known) return known;
  return error instanceof ApiError && error.status === 403 ? t.inbox.readForbidden : t.common.error;
}
