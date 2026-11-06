import { isNoAnswer } from '@ab/client-core';
import { errorCode } from '@/features/teaching/schedule';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { SEND_UNCONFIRMED } from './draft-store';

const ERRORS: Record<string, string | undefined> = t.inbox.error;

/** The API's reason as an inbox.error key (409 session_closed, 400 invalid_phone…; a bare 403 'forbidden'). */
export function sendErrorCode(error: unknown): string {
  // No answer (the 30 s deadline, a dropped line): unconfirmed, not refused (docs/44 BUG7).
  if (isNoAnswer(error)) return SEND_UNCONFIRMED;
  const code = errorCode(error);
  if (!code && error instanceof ApiError && error.status === 403) return 'forbidden';
  return code ?? 'send_failed';
}

/** After a failed send the chat re-reads: the window closed, or the send may have gone. */
export const rereadsAfter = (error: unknown): boolean =>
  [SEND_UNCONFIRMED, 'session_closed'].includes(sendErrorCode(error));

/** An inbox.error key in words, else «لم تُرسل». */
export const sendErrorCodeText = (code: string): string => ERRORS[code] ?? t.inbox.error.send_failed;

/** The API's reason in words (a bare 403 «غير مسموح لك بالإرسال»), else «لم تُرسل». */
export const sendErrorText = (error: unknown): string => sendErrorCodeText(sendErrorCode(error));
