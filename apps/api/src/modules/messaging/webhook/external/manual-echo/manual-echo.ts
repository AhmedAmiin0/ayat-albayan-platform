import type { Tables } from '@ab/db';
import { WHATSAPP_SEND_MS } from '@ab/shared';

// «أرسل عبر واتساب» (owner 2026-11-06): staff marked a held text sent_manually, then sent it from
// the WhatsApp Business app; the app's echo (smb_message_echoes) is that same message. Pure rules
// for which row it is: same phone (the read), same line / number, the same text after folding
// whitespace, marked within MANUAL_ECHO_MS before the echo, and no wamid yet.

/** How long after «أرسل عبر واتساب» the app's echo is still taken as that message. */
export const MANUAL_ECHO_MS = WHATSAPP_SEND_MS;
/** WhatsApp's whole-second time may run a little behind our mark. */
export const MANUAL_ECHO_SKEW_MS = 2 * 60_000;

/** A sent_manually row with no wamid yet, as the attach reads it. */
export type ManualRow = Pick<
  Tables<'messages'>,
  'id' | 'body' | 'line' | 'number_id' | 'sent_manually_at'
>;

/** Where the echo came from: its line and wa_numbers row, when known. */
export interface EchoOrigin {
  line: string | null;
  numberId: string | null;
}

/** Runs of spaces, tabs and line breaks become one space; the ends are trimmed. */
export const foldText = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Two known values must agree; an unknown one (a single line, a row never routed) does not. */
const agrees = (a: string | null, b: string | null): boolean => a === null || b === null || a === b;

const sameOrigin = (row: ManualRow, from: EchoOrigin): boolean =>
  agrees(row.number_id, from.numberId) && agrees(row.line, from.line);

const markedAt = (row: ManualRow): number => Date.parse(row.sent_manually_at ?? '');

/**
 * The rows the echo may be, oldest mark first (two identical texts: the first takes the first
 * echo). Never a row with another text or from another line / number. Empty: store it as today.
 */
export function manualMatches(
  rows: readonly ManualRow[],
  echo: { body: string; from: EchoOrigin },
): ManualRow[] {
  const text = foldText(echo.body);
  const matches = rows.filter(
    (r) => text !== '' && foldText(r.body ?? '') === text && sameOrigin(r, echo.from),
  );
  return matches.sort((a, b) => markedAt(a) - markedAt(b));
}

/** The span of marks the echo at `at` may answer. */
export function markSpan(at: Date): { since: Date; until: Date } {
  return {
    since: new Date(at.getTime() - MANUAL_ECHO_MS),
    until: new Date(at.getTime() + MANUAL_ECHO_SKEW_MS),
  };
}
