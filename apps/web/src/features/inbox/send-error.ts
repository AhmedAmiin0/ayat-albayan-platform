import { errorCode } from '@/features/schedule/api';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

const ERRORS: Record<string, string | undefined> = t.inbox.error;

/** The API's reason as an inbox.error key (409 session_closed, 400 invalid_phone…; a bare 403 'forbidden'). */
export function sendErrorCode(error: unknown): string {
  const code = errorCode(error);
  if (!code && error instanceof ApiError && error.status === 403) return 'forbidden';
  return code ?? 'send_failed';
}

/** An inbox.error key in words, else «لم تُرسل». */
export const sendErrorCodeText = (code: string): string => ERRORS[code] ?? t.inbox.error.send_failed;

/** The API's reason in words (a bare 403 «غير مسموح لك بالإرسال»), else «لم تُرسل». */
export const sendErrorText = (error: unknown): string => sendErrorCodeText(sendErrorCode(error));
