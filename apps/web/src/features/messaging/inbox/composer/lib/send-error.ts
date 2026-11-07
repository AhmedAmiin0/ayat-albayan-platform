import { isNoAnswer, SEND_REPLAYED, SEND_UNCONFIRMED } from '@ab/client-core';
import { errorCode } from '@/features/teaching/schedule';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

/** The send's codes, and «تعديل»'s refusals (400 not_correctable, 403 not_your_message…). */
const ERRORS: Record<string, string | undefined> = {
  ...t.inbox.error,
  ...t.inbox.correction.errors,
};

/** A retry with the kept id was answered with the FIRST message: this one did not go. */
export class ReplayedSend extends Error {}

/**
 * The client's own codes first (docs/44 BUG7): a replay of the first message, then no answer (the
 * 30 s deadline, a dropped line, a 5xx): unconfirmed, not refused.
 */
const CLIENT_CODES: readonly [(error: unknown) => boolean, string][] = [
  [(error) => error instanceof ReplayedSend, SEND_REPLAYED],
  [isNoAnswer, SEND_UNCONFIRMED],
];

/** The API's reason as an inbox.error key (409 session_closed, 400 invalid_phone…; a bare 403 'forbidden'). */
function apiCode(error: unknown): string {
  const code = errorCode(error);
  if (!code && error instanceof ApiError && error.status === 403) return 'forbidden';
  return code ?? 'send_failed';
}

/** The inbox.error key of a failed send. */
export const sendErrorCode = (error: unknown): string =>
  CLIENT_CODES.find(([is]) => is(error))?.[1] ?? apiCode(error);

/** After a failed send the chat re-reads: the window closed, or the send may have gone. */
export const rereadsAfter = (error: unknown): boolean =>
  [SEND_UNCONFIRMED, SEND_REPLAYED, 'session_closed'].includes(sendErrorCode(error));

/** An inbox.error key in words, else «لم تُرسل». */
export const sendErrorCodeText = (code: string): string => ERRORS[code] ?? t.inbox.error.send_failed;

/** The API's reason in words (a bare 403 «غير مسموح لك بالإرسال»), else «لم تُرسل». */
export const sendErrorText = (error: unknown): string => sendErrorCodeText(sendErrorCode(error));
