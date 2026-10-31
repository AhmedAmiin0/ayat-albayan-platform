import type { WaLine } from '@ab/shared';
import { activeNumberId } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, loadEnv } from '@/config/env/env';
import { waHttpError } from '@/modules/messaging/whatsapp';
import type { KapsoReopener } from '@/modules/messaging/inbox/reopen/kapso-reopener';
import { pickSend, type ThreadWindow } from './send-number';
import type { SendLineCode } from './send-line';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';

interface SendFromLine {
  line?: WaLine;
  number_id?: string;
}

interface LineAt {
  now: Date;
  /** v_thread_numbers of the thread's phone, read in module mode only. */
  windows: () => Promise<readonly ThreadWindow[]>;
}

interface TextLineAt extends LineAt {
  phone: string;
  /** Kapso's own conversation record (absent in a bare test: no reopen). */
  kapso: Pick<KapsoReopener, 'reopen'> | undefined;
}

/** The chat line runs on the kapso driver (legacy: WA_CHAT_*; module mode: its default number). */
const chatOnKapso = (): boolean => lineEnvs(loadEnv()).chat?.provider === 'kapso';

const lineError = (code: SendLineCode) =>
  code === 'line_not_configured' ? waHttpError('line_not_configured', 503) : waHttpError('session_closed', 409);

/**
 * pickSend as the inbox answers it: 409 session_closed (no thread too), 503 line_not_configured.
 * Legacy: pickSendLine's { line? }; module mode (docs/23c decision 6): { number_id, line } from
 * the reply windows, which `windows` reads (module mode only).
 */
export async function sendLine(thread: ThreadRow | null, at: LineAt): Promise<SendFromLine> {
  const picked = await pickSend({ thread, now: at.now, windows: at.windows });
  if ('code' in picked) throw lineError(picked.code);
  return picked;
}

/**
 * A free text's line (owner 2026-10-31, «try to send if the last conversation is older than 24
 * hours»): sendLine, except that with every window closed on a chat line that runs on Kapso it
 * is still tried from the chat line (its default number in module mode, as the claim stamps it).
 * First Kapso's own conversation record goes back to `active` (KapsoReopener: bounded, never
 * throws, logs the last 4 digits only); then WhatsApp decides: 131047 fails the row at once.
 * No thread (a number that never wrote), meta and crm chat lines: 409 as before.
 */
export async function textLine(thread: ThreadRow | null, at: TextLineAt): Promise<SendFromLine> {
  const picked = await pickSend({ thread, now: at.now, windows: at.windows });
  if (!('code' in picked)) return picked;
  if (picked.code !== 'session_closed' || !chatOnKapso()) throw lineError(picked.code);
  await at.kapso?.reopen(at.phone);
  const numberId = activeNumberId('chat');
  return { line: 'chat', ...(numberId ? { number_id: numberId } : {}) };
}
