import {
  AWAITING_REPLY,
  HOLD_DAYS,
  isReactionPayload,
  isWaWindowClosed,
  restrictedMay,
  type TemplateView,
  type WaLine,
} from '@ab/shared';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';

// The 24 h window's pure rules (owner 2026-11-03): which refusal is the window, which row the
// window holds, which template may reopen it, and which held rows the family has answered.

/** How long a text waits for the family's reply, from when it was written. */
export const HOLD_MS = HOLD_DAYS * 24 * 60 * 60_000;

/**
 * Kapso's own refusal (HTTP 422, no Meta code): «Cannot send non-template messages outside the
 * 24-hour window.»
 */
const KAPSO_WINDOW_TEXT = /outside (of )?the 24[- ]hour window/i;
const KAPSO_WINDOW_STATUS = 422;

const kapsoWindow = (e: WaError): boolean =>
  e.info.status === KAPSO_WINDOW_STATUS &&
  KAPSO_WINDOW_TEXT.test(`${e.message} ${e.info.details ?? ''}`);

/** WhatsApp refused free text outside the 24 h window: Meta's 131047 / 470, or Kapso's 422. */
export function isWindowClosedError(error: unknown): boolean {
  if (!(error instanceof WaError)) return false;
  return isWaWindowClosed(error.info.code) || kapsoWindow(error);
}

/** The row fields the hold reads. */
type HoldRow = Pick<
  DueMessage,
  'template_key' | 'created_by' | 'sent_by_teacher_id' | 'interactive_payload'
>;

/** A text written by a staff member: not a job's row, not a teacher's (docs/19). */
const staffWritten = (row: HoldRow): boolean => row.created_by !== null && !row.sent_by_teacher_id;

/** A session message (no template) that is not a reaction. */
const sessionMessage = (row: HoldRow): boolean =>
  row.template_key === null && !isReactionPayload(row.interactive_payload ?? null);

/**
 * The only rows the window holds: a staff member's own session message (text, file, forward,
 * payment link) leaving from the chat line. A teacher's text, a job's row, a template, a reaction
 * or another line keeps today's path (a window refusal fails it, never retried).
 */
export function holdable(row: HoldRow, line: WaLine): boolean {
  return line === 'chat' && staffWritten(row) && sessionMessage(row);
}

const URL_PARAM = '{{1}}';
const needsNoValue = (t: TemplateView): boolean =>
  t.params.length === 0 && !t.buttons.some((b) => b.type === 'url' && b.url.includes(URL_PARAM));

/**
 * The `chat_reopen_template` rule (owner 2026-11-03): an approved template of the chat line that
 * a restricted role may send (sales_starter, never a PDF or own-button one), with no variables.
 * Anything else (unset, unknown, pending, another line, variables) reopens nothing.
 */
export function reopenUsable(t: TemplateView | null): boolean {
  return t !== null && t.line === 'chat' && restrictedMay(t) && needsNoValue(t);
}

/** What a due row marked AWAITING_REPLY needs: held now, failed (its 7 days are over), or none. */
type HeldStep = 'hold' | 'expire' | null;

type HeldDue = Pick<DueMessage, 'error_code' | 'expires_at'>;

/**
 * A due AWAITING_REPLY row: no deadline yet = the inbox just queued it after the window (hold it);
 * a deadline = it came due at its deadline (next_attempt_at = expires_at): it expires.
 */
export function heldStep(row: HeldDue): HeldStep {
  if (row.error_code !== AWAITING_REPLY) return null;
  return row.expires_at === null ? 'hold' : 'expire';
}

/** A held (or just queued) row as the release reads it. */
export interface WaitingRow {
  id: string;
  phone_e164: string;
  created_at: string;
  /** When it was held (null: queued by the inbox, not held yet: its created_at counts). */
  scheduled_for: string | null;
}

/**
 * The rows the family has answered: their phone's newest chat-line inbound is after the hold
 * began. Each row by its own phone only, so a reply never releases another family's text.
 */
export function answered(
  rows: readonly WaitingRow[],
  lastChat: ReadonlyMap<string, string>,
): string[] {
  return rows
    .filter((r) => {
      const inbound = lastChat.get(r.phone_e164);
      return (
        inbound !== undefined && Date.parse(inbound) > Date.parse(r.scheduled_for ?? r.created_at)
      );
    })
    .map((r) => r.id);
}
