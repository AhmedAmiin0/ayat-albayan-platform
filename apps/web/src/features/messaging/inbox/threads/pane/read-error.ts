import { errorCode } from '@/features/teaching/schedule';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

const ERRORS: Record<string, string | undefined> = t.inbox.error;

/**
 * A failed thread load in words: the API's reason when it has one (403 not_your_thread…), a bare 403
 * is about reading the chat (not sending), else the generic error.
 */
export function readErrorText(error: unknown): string {
  const coded = ERRORS[errorCode(error) ?? ''];
  if (coded) return coded;
  return error instanceof ApiError && error.status === 403 ? t.inbox.readForbidden : t.common.error;
}
