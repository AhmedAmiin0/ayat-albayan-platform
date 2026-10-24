import { mergeWindows, replyNumber, type NumberWindow, type WaLine } from '@ab/shared';
import { Logger } from '@nestjs/common';
import { overlayNumbers, type OverlayNumber } from '../../common/integrations/numbers-overlay';
import { pickSendLine, type SendLineCode } from './send-line';
import type { ThreadRow } from './threads.mapper';

// Reply per number (docs/23c decision 6). Module mode only: under legacy (overlayNumbers() === null)
// pickSend is pickSendLine exactly and never reads the per-number windows.

export type SendPick = { line?: WaLine; number_id?: string } | { code: SendLineCode };

export interface SendPickInput {
  thread: ThreadRow | null;
  now: Date;
  /** v_thread_numbers of the thread's phone (ThreadsQueries.numberWindows); read in module mode only. */
  windows: () => Promise<readonly NumberWindow[]>;
}

const log = new Logger('SendNumber');

/** The thread's legacy line windows (v_threads, before the flip) as windows of each role's default number. */
export function legacyWindows(thread: ThreadRow, numbers: readonly OverlayNumber[]): NumberWindow[] {
  const at: Record<WaLine, string | null> = {
    chat: thread.last_chat_inbound_at,
    notifications: thread.last_notifications_inbound_at,
  };
  return numbers.filter((n) => n.is_default).map((n) => ({ numberId: n.id, lastInboundAt: at[n.purpose] }));
}

/** The overlay number can send now: enabled and its own credentials make a client. */
const sendable = (n: OverlayNumber | undefined): n is OverlayNumber => Boolean(n?.enabled && n.env !== null);

/**
 * replyNumber() over the stamped windows merged with the legacy ones: { number_id, line = purpose }, else
 * the inbox's codes (number_not_configured → line_not_configured 503, session_closed → 409).
 */
export function pickNumber(input: { thread: ThreadRow; stamped: readonly NumberWindow[]; numbers: readonly OverlayNumber[]; now: Date }): SendPick {
  const byId = new Map(input.numbers.map((n) => [n.id, n]));
  const windows = mergeWindows(input.stamped, legacyWindows(input.thread, input.numbers));
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
  let stamped: readonly NumberWindow[];
  try {
    stamped = await input.windows();
  } catch (e) {
    log.warn(`reply windows read failed, nothing sent: ${e instanceof Error ? e.message : String(e)}`);
    return { code: 'line_not_configured' };
  }
  return pickNumber({ thread: input.thread, stamped, numbers, now: input.now });
}
