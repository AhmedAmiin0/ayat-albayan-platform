import type { MessageStatus } from '@ab/catalog';
import { localDate } from '../../lesson/timing.day-before';

// The reopen template goes only when staff send in a closed chat, never on open; the text is held.

// The template is the `chat_reopen_template` setting (default welcome_greeting).

/** The day the dedupe counts in. */
export const REOPEN_TZ = 'Asia/Riyadh';

/**
 * POST /threads/:phone/reopen's answer, kept for app builds older than 2026-11-07 that call it on
 * open: the window is still open, or the starter goes on the first send. It never queues anything.
 */
export type ReopenTemplateOutcome = 'window_open' | 'on_send';

/** POST /threads/:phone/reopen (old clients only). */
export interface ThreadReopenView {
  /** Always false since 2026-11-07 (the hold reopens Kapso's record on send). */
  kapso_reopened: boolean;
  template: ReopenTemplateOutcome;
}

/**
 * `reopen:<E.164>:<Asia/Riyadh date>`: a second send the same day queues no second template. A
 * later try the same day (the first failed or expired unsent) adds `:<try>` (2, 3…), so it is not
 * deduped away.
 */
export function reopenDedupKey(phone: string, now: Date, attempt = 1): string {
  const day = `reopen:${phone}:${localDate(now, REOPEN_TZ)}`;
  return attempt > 1 ? `${day}:${attempt}` : day;
}

// A staff text to a family whose
// chat window is closed is never sent as free text. The sender sends one reopen template (the
// `chat_reopen_template` setting, an approved chat-line starter with no variables) and holds the
// text until the family answers on the chat line; after HOLD_DAYS it fails, never sent late.

/** messages.error_code of a queued text waiting for the family's reply. */
export const AWAITING_REPLY = 'awaiting_reply';
/** A held text the family never answered within HOLD_DAYS: failed, never sent late. */
export const HOLD_EXPIRED = 'hold_expired';
/** WhatsApp refused free text outside the window (Kapso 422 / Meta 131047), on a row not held. */
export const WINDOW_CLOSED = 'window_closed';
/** The window is closed and no usable reopen template is set: the text fails with this reason. */
export const REOPEN_UNAVAILABLE = 'reopen_unavailable';
/** A held text whose reopen template failed or expired unsent: failed, so staff can resend it. */
export const REOPEN_FAILED = 'reopen_failed';
/** Today's reopen template tries are all used: the text fails, staff may send it again tomorrow. */
export const REOPEN_TRIES_USED = 'reopen_tries_used';
/** The app-send window and grace passed with no echo (docs/19); staff confirm by hand. */
export const APP_SEND_UNCONFIRMED = 'app_send_unconfirmed';
/** How long a held text waits for the family's reply. */
export const HOLD_DAYS = 7;

/** A queued text held for the family's reply, not a retry. */
export function isAwaitingReply(m: { status: string; error_code: string | null }): boolean {
  return m.status === 'queued' && m.error_code === AWAITING_REPLY;
}

// With REOPEN_NO_TEMPLATE the conversation reopens and the text waits up to 7 days for a reply.

/** The `chat_reopen_template` value for no template, waiting for the family's reply. */
export const REOPEN_NO_TEMPLATE = 'none';

/** What asks the family to reply after the window: a starter template, or nothing (wait). */
export type ReopenChoice = 'template' | 'wait';

/** The admin's choice from the stored setting (any other value is a template key). */
export function reopenChoiceOf(setting: string): ReopenChoice {
  return setting.trim().toLowerCase() === REOPEN_NO_TEMPLATE ? 'wait' : 'template';
}

/** The failed codes of a held text a staff retry holds again with a fresh 7 days. */
const HOLD_FAILURES: ReadonlySet<string> = new Set([
  REOPEN_FAILED,
  REOPEN_UNAVAILABLE,
  REOPEN_TRIES_USED,
]);

export const isHoldFailure = (code: string | null | undefined): boolean =>
  HOLD_FAILURES.has(code ?? '');

// Staff pick the template themselves.

/** The reopen template live for a phone (pending or sent, not yet answered): the bar's tick. */
export interface ReopenSent {
  id: string;
  template_key: string;
  status: MessageStatus;
}

/** ThreadView's reopen fields (a closed window on the chat line). */
export interface ReopenFields {
  /** Kapso chat line: after the window a staff text is held; reopen_choice: what asks a reply. */
  try_after_window?: boolean;
  reopen_choice?: 'template' | 'wait';
  /** Thread page, window closed: the reopen template live for this phone; absent/null = none. */
  reopen_sent?: ReopenSent | null;
  /** The academy's `chat_reopen_template` (the picker's preselected key); absent = none set. */
  reopen_template?: string;
}
