import type { MessageView } from '@ab/shared';
import type { ThreadCache } from '@/inbox/thread/hooks/thread-cache';

// docs/44 BUG7: a send that ended WITHOUT an answer (the 30 s deadline, a dropped connection) may
// have reached the server. Its bubble stays, marked «unconfirmed», until a re-read of the chat
// finds the server's row; a retry reuses the same clientRequestId, so it is never a second message.

/** The provisional row's error_code while its send has no answer (client-side only). */
export const SEND_UNCONFIRMED = 'send_unconfirmed';

/** How far the phone's clock may be ahead of the server's when matching the server's row. */
const CLOCK_SKEW_MS = 5 * 60_000;

/** A provisional row whose send ended with no answer: «لم يتأكد الإرسال بعد». */
export const isUnconfirmed = (m: Pick<MessageView, 'status' | 'error_code'>): boolean =>
  m.status === 'queued' && m.error_code === SEND_UNCONFIRMED;

/** The provisional row with this id marked unconfirmed (kept on screen, never rolled back). */
export function markUnconfirmed(data: ThreadCache | undefined, id: string) {
  if (!data) return data;
  const mark = (m: MessageView): MessageView =>
    m.id === id ? { ...m, error_code: SEND_UNCONFIRMED } : m;
  return { ...data, pages: data.pages.map((p) => ({ ...p, messages: p.messages.map(mark) })) };
}

/** Same words: a template by its key (the server renders its own body), a text by its body. */
const sameContent = (m: MessageView, sent: MessageView): boolean =>
  sent.template_key === null ? m.body === sent.body : m.template_key === sent.template_key;

const isOutbound = (m: MessageView): boolean => m.direction === 'outbound';

/**
 * The server's row of an unconfirmed send in a fresh page: ours, not held before the send
 * (`known`), the same words, created no earlier than the send (allowing for clock skew).
 */
export function sentRowOf(
  fresh: readonly MessageView[],
  sent: MessageView,
  known: ReadonlySet<string>,
): MessageView | undefined {
  const from = Date.parse(sent.created_at) - CLOCK_SKEW_MS;
  const isNew = (m: MessageView): boolean => !known.has(m.id) && Date.parse(m.created_at) >= from;
  return fresh.find((m) => isOutbound(m) && isNew(m) && sameContent(m, sent));
}
