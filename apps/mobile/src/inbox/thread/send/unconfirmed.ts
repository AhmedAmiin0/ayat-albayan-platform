import { SEND_UNCONFIRMED } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import type { ThreadCache } from '@/inbox/thread/hooks/thread-cache';

// docs/44 BUG7: a send that ended WITHOUT an answer (the 30 s deadline, a dropped connection, a
// 5xx) may have reached the server. Its bubble stays, marked «unconfirmed», until a read of the
// chat shows the server's row (resolve-held).

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

/** The provisional rows with these ids taken out (their server rows are on screen). */
export function dropRows(data: ThreadCache | undefined, ids: ReadonlySet<string>) {
  if (!data) return data;
  const keep = (m: MessageView): boolean => !ids.has(m.id);
  return { ...data, pages: data.pages.map((p) => ({ ...p, messages: p.messages.filter(keep) })) };
}
