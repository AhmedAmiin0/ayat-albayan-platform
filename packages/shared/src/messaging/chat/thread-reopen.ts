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

/** `reopen:<E.164>:<Asia/Riyadh date>`: a second open the same day enqueues nothing. */
export function reopenDedupKey(phone: string, now: Date): string {
  return `reopen:${phone}:${localDate(now, REOPEN_TZ)}`;
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
/** How long a held text waits for the family's reply. */
export const HOLD_DAYS = 7;

/** A queued text held for the family's reply: the bubble says «بانتظار رد العائلة», not a retry. */
export function isAwaitingReply(m: { status: string; error_code: string | null }): boolean {
  return m.status === 'queued' && m.error_code === AWAITING_REPLY;
}
