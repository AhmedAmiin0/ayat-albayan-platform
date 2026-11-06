import { WA_ERROR as E } from '@ab/catalog';
import { z } from 'zod';
import type { MessageView } from '../chat/views.js';
import {
  AWAITING_REPLY,
  HOLD_EXPIRED,
  REOPEN_FAILED,
  REOPEN_TRIES_USED,
  REOPEN_UNAVAILABLE,
  WINDOW_CLOSED,
} from '../chat/thread-reopen.js';

// «أرسل عبر واتساب» (owner 2026-11-06, «I don't want this 24h limitation»): a staff text that the
// 24 h window stopped is sent by staff from the WhatsApp Business app (coexistence: app sends have
// no window). The tap only opens a short pending window (app_send_until): the platform never sends
// the row meanwhile, and the app's echo, when it comes, confirms the send (docs/19).

/** Failed codes that mean «stopped by the 24 h window», never another failure. */
const WINDOW_FAILURES: ReadonlySet<string> = new Set([
  REOPEN_UNAVAILABLE,
  REOPEN_FAILED,
  REOPEN_TRIES_USED,
  HOLD_EXPIRED,
  WINDOW_CLOSED,
  String(E.reEngagement),
  String(E.outsideWindow),
]);

type WindowRow = Pick<MessageView, 'status' | 'error_code'>;

/** Held for the family's reply (queued awaiting_reply), or failed for a window reason. */
const STOPPED: Partial<Record<MessageView['status'], (code: string) => boolean>> = {
  queued: (code) => code === AWAITING_REPLY,
  failed: (code) => WINDOW_FAILURES.has(code),
};

/** The row was stopped by the 24 h window (held, or failed for it). */
export function stoppedByWindow(m: WindowRow): boolean {
  return STOPPED[m.status]?.(m.error_code ?? '') ?? false;
}

type SendRow = Pick<
  MessageView,
  'direction' | 'status' | 'error_code' | 'body' | 'template_key' | 'media_mime' | 'replyable'
>;

const plainText = (m: SendRow): boolean =>
  Boolean(m.body?.trim()) && m.template_key === null && m.media_mime === null;

/**
 * A row WhatsApp accepted and then refused (131047 by status) keeps its wamid: the app's echo
 * could never attach to it (a wamid is never overwritten), so it has no button (review 2026-11-06).
 */
const noWamid = (m: SendRow): boolean => m.replyable !== true;

/** «أرسل عبر واتساب» shows: our text (no template, no file, v1) stopped by the 24 h window. */
export function canSendViaWhatsApp(m: SendRow): boolean {
  return m.direction === 'outbound' && plainText(m) && noWamid(m) && stoppedByWindow(m);
}

/**
 * messages.error_code of a reopen template that was still queued when the app's echo confirmed
 * the held text (no other text waited for that family), or that a lost hold queued: never sent.
 */
export const REOPEN_NOT_NEEDED = 'reopen_not_needed';

/** How long one tap keeps the platform from sending the row (app_send_until = now + this). */
export const APP_SEND_MS = 10 * 60_000;
/**
 * After the window passed the platform still waits this long before it may send the row, and a
 * message (echo, status, catch-up every 10 min) still attaches within it: whatever confirms the
 * app send lands before the platform could send it too (review 2026-11-06).
 */
export const APP_SEND_GRACE_MS = 15 * 60_000;

/** «جارٍ الإرسال من واتساب…»: the tap's window is still open at `now`. */
export function appSendPending(m: Pick<MessageView, 'app_send_until'>, now: Date): boolean {
  return Date.parse(m.app_send_until ?? '') > now.getTime();
}

/** 409 of POST /messages/:id/app-send: the row as it is now (never a held text any more). */
export const appSendRefusalSchema = z.object({
  code: z.literal('not_app_send'),
  status: z.string(),
  error_code: z.string().nullable().optional(),
});

/** What a refused tap says: the platform is sending it, it was sent already, or neither. */
export type AppSendRefusal = 'sending' | 'sent' | 'other';

const SENT: ReadonlySet<string> = new Set(['sent', 'delivered', 'read', 'sent_manually']);
const sentOrOther = (status: string): AppSendRefusal => (SENT.has(status) ? 'sent' : 'other');

/** The refusal of a 409 body; null for any other error (a network or server error). */
export function appSendRefusal(body: unknown): AppSendRefusal | null {
  const parsed = appSendRefusalSchema.safeParse(body);
  if (!parsed.success) return null;
  const { status, error_code } = parsed.data;
  const claimed = status === 'queued' && error_code === 'sending';
  return claimed ? 'sending' : sentOrOther(status);
}
