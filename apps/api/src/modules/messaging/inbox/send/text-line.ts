import { AWAITING_REPLY, type WaLine } from '@ab/shared';
import { activeNumberId } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, loadEnv } from '@/config/env/env';
import { waHttpError, windowless } from '@/modules/messaging/whatsapp';
import { pickSend, type ThreadWindow } from './send-number';
import type { SendLineCode } from './send-line';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';

interface SendFromLine {
  line?: WaLine;
  number_id?: string;
  /** AWAITING_REPLY: the window is closed, the sender holds it behind the reopen template. */
  error_code?: typeof AWAITING_REPLY;
}

interface LineAt {
  now: Date;
  /** v_thread_numbers of the thread's phone, read in module mode only. */
  windows: () => Promise<readonly ThreadWindow[]>;
}

/**
 * The chat line runs on the kapso driver (legacy: WA_CHAT_*; module mode: its default number). A
 * meta or crm chat line keeps 409 (its composer offers templates only after the window).
 */
const chatOnKapso = (): boolean => lineEnvs(loadEnv()).chat?.provider === 'kapso';

/**
 * The chat line is an Evolution Baileys number (docs/19 «Evolution driver»): WhatsApp Web has no
 * 24 h window, so a closed window never refuses or holds a send there.
 */
const chatWindowless = (): boolean => windowless(lineEnvs(loadEnv()).chat);

/** The chat line, stamped with its default number in module mode, sent as is (no hold). */
function freeChat(): SendFromLine {
  const numberId = activeNumberId('chat');
  return { line: 'chat', ...(numberId ? { number_id: numberId } : {}) };
}

/** A closed window of a thread that exists, on a windowless chat line: it goes as free text. */
const goesFree = (thread: ThreadRow | null, code: SendLineCode): boolean =>
  thread !== null && code === 'session_closed' && chatWindowless();

const lineError = (code: SendLineCode) =>
  code === 'line_not_configured' ? waHttpError('line_not_configured', 503) : waHttpError('session_closed', 409);

/**
 * pickSend as the inbox answers it: 409 session_closed (no thread too), 503 line_not_configured.
 * Legacy: pickSendLine's { line? }; module mode (docs/23c decision 6): { number_id, line } from
 * the reply windows, which `windows` reads (module mode only).
 */
export async function sendLine(thread: ThreadRow | null, at: LineAt): Promise<SendFromLine> {
  const picked = await pickSend({ thread, now: at.now, windows: at.windows });
  if (!('code' in picked)) return picked;
  if (goesFree(thread, picked.code)) return freeChat();
  throw lineError(picked.code);
}

/**
 * A free text's line (owner 2026-11-03, «not sent after 24h»): sendLine, except that with every
 * window closed on a Kapso chat line (chatOnKapso) the row is queued from the chat line (its
 * default number in module mode, as the claim stamps it) marked AWAITING_REPLY: the sender
 * sends the reopen template first and holds the text until the family answers
 * (whatsapp/sender/window). Never sent as free text. Kapso's conversation PATCH is gone:
 * it never reopened WhatsApp's window. No thread (a number that never wrote), meta and crm: 409.
 */
export async function textLine(thread: ThreadRow | null, at: LineAt): Promise<SendFromLine> {
  const picked = await pickSend({ thread, now: at.now, windows: at.windows });
  if (!('code' in picked)) return picked;
  if (goesFree(thread, picked.code)) return freeChat();
  if (picked.code !== 'session_closed' || !chatOnKapso()) throw lineError(picked.code);
  const numberId = activeNumberId('chat');
  return { line: 'chat', ...(numberId ? { number_id: numberId } : {}), error_code: AWAITING_REPLY };
}

interface ChatLineAt extends LineAt {
  /** Teacher mode (docs/19): the window still refuses (409), as for a teacher's text. */
  teacher: boolean;
}

/**
 * The line of every staff send from a chat (owner 2026-11-01, «do the same as the messages»): a
 * text, a reply, a payment link typed into the box, a file or receipt, a sticker, a GIF and a
 * forward all leave as a text does: textLine (held behind the reopen template after the
 * window), and sendLine in teacher mode. Templates and automatic notifications never come here.
 */
export function chatLine(thread: ThreadRow | null, at: ChatLineAt): Promise<SendFromLine> {
  return at.teacher ? sendLine(thread, at) : textLine(thread, at);
}
