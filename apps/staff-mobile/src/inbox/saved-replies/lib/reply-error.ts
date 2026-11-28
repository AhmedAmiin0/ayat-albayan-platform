import { savedReplyErrorSchema } from '@ab/shared';
import { ApiError, t } from '@ab/mobile-kit';
import { ChatFileError } from '@/inbox/composer/send-file';

const codeOf = (error: unknown): unknown =>
  error instanceof ApiError && typeof error.body === 'object' && error.body !== null ? Reflect.get(error.body, 'code') : undefined;

export function replyError(error: unknown): string {
  if (error instanceof ChatFileError) return t.inbox.error[error.code];
  const code = codeOf(error);
  const files: Record<string, string> = t.inbox.error;
  const own: Record<string, string> = t.savedReplies.errors;
  const known = savedReplyErrorSchema.safeParse(code);
  if (!known.success) return t.savedReplies.errors.generic;
  return own[known.data] ?? files[known.data] ?? t.savedReplies.errors.generic;
}
