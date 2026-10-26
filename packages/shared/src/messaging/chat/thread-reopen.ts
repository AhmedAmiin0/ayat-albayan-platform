import { localDate } from '../lesson/timing.day-before.js';

// «إعادة فتح المحادثة» (owner 2026-10-26): opening a thread whose 24 h window is closed asks the
// server, once, to reopen it: Kapso's own conversation record (chat number on the kapso driver) and
// one approved template, the only thing that reopens WhatsApp's window.

// The template is the `chat_reopen_template` setting (default inquiry_followup_ar_v2, owner 2026-10-26).

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
