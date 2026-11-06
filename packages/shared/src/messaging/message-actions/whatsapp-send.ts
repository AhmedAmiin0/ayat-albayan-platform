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
// no window). The platform marks it sent_manually FIRST, so it can never send it too.

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
  'direction' | 'status' | 'error_code' | 'body' | 'template_key' | 'media_mime'
>;

const plainText = (m: SendRow): boolean =>
  Boolean(m.body?.trim()) && m.template_key === null && m.media_mime === null;

/** «أرسل عبر واتساب» shows: our text (no template, no file, v1) stopped by the 24 h window. */
export function canSendViaWhatsApp(m: SendRow): boolean {
  return m.direction === 'outbound' && plainText(m) && stoppedByWindow(m);
}

/**
 * messages.error_code of a reopen template that was still queued when staff sent the held text
 * from WhatsApp themselves (no other text waited for that family): never sent, never retried.
 */
export const REOPEN_NOT_NEEDED = 'reopen_not_needed';

/** How long after «أرسل عبر واتساب» its undo (WhatsApp did not open) and the app's echo count. */
export const WHATSAPP_SEND_MS = 30 * 60_000;

/**
 * POST /messages/:id/retry?undo=whatsapp: «تراجع» of «أرسل عبر واتساب» (sent_manually → queued).
 * Without it a retry only takes a failed row: a stale «حاول مرة أخرى» never undoes a manual send.
 */
export const messageRetryQuerySchema = z.object({ undo: z.literal('whatsapp').optional() });
export type MessageRetryQuery = z.infer<typeof messageRetryQuerySchema>;

/** A sent_manually row as the echo attach and the undo read it. */
export interface ManualSendStamp {
  wa_message_id: string | null;
  sent_at: string | null;
  sent_manually_at: string | null;
}

/**
 * The app's echo is on the row: it carries a wamid stamped at or after the mark (sent_at ≥
 * sent_manually_at). A row that failed after WhatsApp took it keeps its old wamid and sent_at from
 * before the mark: no echo yet.
 */
export function echoAttached(r: ManualSendStamp): boolean {
  const sent = Date.parse(r.sent_at ?? '');
  return r.wa_message_id !== null && sent >= Date.parse(r.sent_manually_at ?? '');
}
