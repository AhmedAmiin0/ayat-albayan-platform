import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';

/** A failed thread load in words: a bare 403 is about reading the chat (not sending), else the generic error. */
export function readErrorText(error: unknown): string {
  return error instanceof ApiError && error.status === 403 ? t.inbox.readForbidden : t.common.error;
}
