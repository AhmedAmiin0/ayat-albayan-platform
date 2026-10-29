import { isSavedReplyError } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ChatFileError } from '../../composer/send-file';

const codeOf = (error: unknown): unknown =>
  error instanceof ApiError && typeof error.body === 'object' && error.body !== null ? Reflect.get(error.body, 'code') : undefined;

/** What a failed save, delete, move or upload says: its own words, the chat's file words, else «تعذّر الحفظ». */
export function replyError(error: unknown): string {
  if (error instanceof ChatFileError) return t.inbox.error[error.code];
  const code = codeOf(error);
  const files: Record<string, string> = t.inbox.error;
  const own: Record<string, string> = t.savedReplies.errors;
  if (isSavedReplyError(code)) return own[code] ?? files[code] ?? t.savedReplies.errors.generic;
  return t.savedReplies.errors.generic;
}
