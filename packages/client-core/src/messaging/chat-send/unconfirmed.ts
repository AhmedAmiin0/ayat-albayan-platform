import { correctionBody, stripCorrectionPrefix, type MessageView } from '@ab/shared';
import type { ThreadPages } from '../inbox/index.js';

// docs/44 BUG7, shared by web and mobile. The server dedups `who:phone:clientRequestId` with no
// kind and no expiry, and a replay returns the FIRST row (201) whatever the new body. The rule:
// after a send with no answer (deadline, network, 5xx) the sender owns a PINNED id for that chat;
// every send from it reuses that id until a send with it gets an ANSWER (a 2xx or a 4xx). Nothing
// is guessed from reads: the server's answer alone releases the pin.

/** A send with no answer (its bubble on mobile, the box's failed code on web). */
export const SEND_UNCONFIRMED = 'send_unconfirmed';

/** A send with the pinned id was answered with the FIRST message: the edit was not sent. */
export const SEND_REPLAYED = 'send_replayed';

/** A text send's 2xx: its row, and from the API whether its request id replayed the FIRST row. */
export type TextAnswer = MessageView & { replayed?: boolean | undefined };

/** What a send carried: its text; a correction («تعديل») also its original and the app's prefix. */
export interface SentText {
  text: string;
  correction?: { id: string; prefix: string } | undefined;
}

type Answer = Pick<TextAnswer, 'body' | 'corrects_id' | 'replayed'>;
type Correction = NonNullable<SentText['correction']>;

const bodyOf = (row: Answer): string => (row.body ?? '').trim();

/**
 * A correction (owner 2026-11-07) is this send only when it corrects the same original. A new row
 * ends with the text (the prefix may be reworded by the admins); a replayed one is this send only
 * when it IS this correction (the app's prefix + the same text: a retry after a lost answer), so a
 * shortened resend or another text under the pinned id is never taken for it.
 */
function correctionEchoes(row: Answer, sent: SentText, c: Correction): boolean {
  const own = stripCorrectionPrefix(c.prefix, sent.text);
  const body = bodyOf(row);
  const same = row.replayed ? body === correctionBody(c.prefix, own) : body.endsWith(own);
  return row.corrects_id === c.id && same;
}

/**
 * A 2xx text answer carrying another message than the one sent: a replay of the first one under
 * this id (checked on EVERY 2xx: a 4xx such as 409 session_closed or 400 reply_not_in_thread is
 * decided before the dedup lookup, so an id it released may still replay). The server only trims,
 * so a plain text always echoes the same body.
 */
export function replayedOther(row: Answer, sent: SentText): boolean {
  const echoes = sent.correction
    ? correctionEchoes(row, sent, sent.correction)
    : bodyOf(row) === sent.text.trim();
  return !echoes;
}

/** The provisional row with this id marked «unconfirmed» (kept on screen, never rolled back). */
export function markUnconfirmed<T extends ThreadPages>(
  data: T | undefined,
  id: string,
): T | undefined {
  if (!data) return data;
  const mark = (m: MessageView): MessageView =>
    m.id === id ? { ...m, error_code: SEND_UNCONFIRMED } : m;
  return { ...data, pages: data.pages.map((p) => ({ ...p, messages: p.messages.map(mark) })) };
}
