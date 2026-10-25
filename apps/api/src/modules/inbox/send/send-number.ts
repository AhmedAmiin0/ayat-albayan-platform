import { mergeWindows, replyNumber, type NumberWindow, type WaLine } from '@ab/shared';
import { Logger } from '@nestjs/common';
import { overlayNumbers, type OverlayNumber } from '../../../common/integrations/numbers-overlay';
import { pickSendLine, type SendLineCode } from './send-line';
import type { ThreadRow } from '../threads/threads.mapper';

/** One v_thread_numbers row: a number's newest inbound, or (numberId null) a line's unstamped history. */
export interface ThreadWindow {
  numberId: string | null;
  line: WaLine;
  lastInboundAt: string | null;
}

// Reply per number (docs/23c decision 6). Module mode only: under legacy (overlayNumbers() === null)
// pickSend is pickSendLine exactly and never reads the per-number windows.

export type SendPick = { line?: WaLine; number_id?: string } | { code: SendLineCode };

export interface SendPickInput {
  thread: ThreadRow | null;
  now: Date;
  /** v_thread_numbers of the thread's phone (ThreadsQueries.numberWindows); read in module mode only. */
  windows: () => Promise<readonly ThreadWindow[]>;
}

const log = new Logger('SendNumber');

/**
 * Every row as a number's window. Unstamped history (number_id null: inbound before the flip) counts for
 * its line's default number; a stamped row only for its own number, so an inbound on a second number never
 * opens a window on the default (review: a reply must leave from a number the family wrote to).
 */
export function numberWindows(rows: readonly ThreadWindow[], numbers: readonly OverlayNumber[]): NumberWindow[] {
  const defaultOf = (line: WaLine) => numbers.find((n) => n.is_default && n.purpose === line)?.id;
  return rows.flatMap((r) => {
    const numberId = r.numberId ?? defaultOf(r.line);
    return numberId ? [{ numberId, lastInboundAt: r.lastInboundAt }] : [];
  });
}

/** The overlay number can send now: enabled and its own credentials make a client. */
const sendable = (n: OverlayNumber | undefined): n is OverlayNumber => Boolean(n?.enabled && n.env !== null);

/**
 * replyNumber() over the thread's windows per number: { number_id, line = purpose }, else
 * the inbox's codes (number_not_configured → line_not_configured 503, session_closed → 409).
 */
export function pickNumber(input: { rows: readonly ThreadWindow[]; numbers: readonly OverlayNumber[]; now: Date }): SendPick {
  const byId = new Map(input.numbers.map((n) => [n.id, n]));
  const windows = mergeWindows(numberWindows(input.rows, input.numbers));
  const picked = replyNumber({ windows, now: input.now, canSend: (id) => sendable(byId.get(id)) });
  if ('code' in picked) return { code: picked.code === 'number_not_configured' ? 'line_not_configured' : 'session_closed' };
  const n = byId.get(picked.numberId);
  return n ? { number_id: n.id, line: n.purpose } : { code: 'line_not_configured' };
}

/**
 * The sender of a session text / file. Legacy: pickSendLine (no new read). Module mode: pickNumber; a
 * failed windows read fails closed as line_not_configured (503): never a send from a guessed number.
 */
export async function pickSend(input: SendPickInput): Promise<SendPick> {
  const numbers = overlayNumbers();
  if (numbers === null) return pickSendLine(input.thread, input.now);
  if (!input.thread) return { code: 'no_thread' };
  let rows: readonly ThreadWindow[];
  try {
    rows = await input.windows();
  } catch (e) {
    log.warn(`reply windows read failed, nothing sent: ${e instanceof Error ? e.message : String(e)}`);
    return { code: 'line_not_configured' };
  }
  return pickNumber({ rows, numbers, now: input.now });
}
