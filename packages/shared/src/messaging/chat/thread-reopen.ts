import { localDate } from '../lesson/timing.day-before.js';

// «إعادة فتح المحادثة» (owner 2026-10-26): opening a thread whose 24 h window is closed asks the
// server, once, to reopen it: Kapso's own conversation record (chat number on the kapso driver) and
// one approved template, the only thing that reopens WhatsApp's window.

// The template is the `chat_reopen_template` setting (default welcome_greeting, owner 2026-11-03).

/** The day the dedupe counts in. */
export const REOPEN_TZ = 'Asia/Riyadh';

/**
 * What became of the template: queued now, queued earlier today, not this role's to send, window still
 * open, the configured template not approved yet (Kapso's reopen only, no fallback), or not sendable.
 */
export type ReopenTemplateOutcome =
  | 'template_queued' | 'already_requested_today' | 'not_allowed' | 'window_open' | 'template_unavailable' | 'not_sent';

/** POST /threads/:phone/reopen. */
export interface ThreadReopenView {
  /** Kapso's conversation record was switched back to active (false: not on kapso, none ended, or Kapso failed). */
  kapso_reopened: boolean;
  template: ReopenTemplateOutcome;
}

/**
 * `reopen:<E.164>:<Asia/Riyadh date>`: a second open the same day enqueues nothing. A later try the
 * same day (the first failed or expired unsent) adds `:<try>` (2, 3…), so it is not deduped away.
 */
export function reopenDedupKey(phone: string, now: Date, attempt = 1): string {
  const day = `reopen:${phone}:${localDate(now, REOPEN_TZ)}`;
  return attempt > 1 ? `${day}:${attempt}` : day;
}

// Owner 2026-11-03 («chat messages are not being sent after 24h»): a staff text to a family whose
// chat window is closed is never sent as free text. The sender sends one reopen template (the
// `chat_reopen_template` setting, an approved chat-line starter with no variables) and holds the
// text until the family answers on the chat line; after HOLD_DAYS it fails, never sent late.

/** messages.error_code of a queued text waiting for the family's reply («بانتظار رد العائلة»). */
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
/**
 * «أرسل عبر واتساب» (docs/19): the tap's window and its grace passed with no echo attached. Never
 * sent by the platform: staff answer «هل أرسلتها من واتساب؟» (yes: sent-manually; no: held again).
 */
export const APP_SEND_UNCONFIRMED = 'app_send_unconfirmed';
/** How long a held text waits for the family's reply. */
export const HOLD_DAYS = 7;

/** A queued text held for the family's reply: the bubble says «بانتظار رد العائلة», not a retry. */
export function isAwaitingReply(m: { status: string; error_code: string | null }): boolean {
  return m.status === 'queued' && m.error_code === AWAITING_REPLY;
}

// Owner 2026-11-06 («give him a choice»): `chat_reopen_template` holds a starter template's key, or
// REOPEN_NO_TEMPLATE («بدون قالب»): then no template is sent, Kapso's conversation is reopened and
// the text waits for the family's next message (7 days at most), as a held text does.

/** The `chat_reopen_template` value of «بدون قالب: انتظار رد العائلة». */
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
