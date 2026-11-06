import { isNoAnswer, sentRowOf } from '@ab/client-core';
import type { MessageView, ThreadDetail } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import {
  mergeNewest,
  type ThreadCache,
  threadKey,
  threadMessages,
  threadPath,
} from '@/inbox/thread/hooks/thread-cache';
import { type HeldSend, heldSends, holdSend, releaseSend } from './pinned-send';
import { dropRows, markUnconfirmed } from './unconfirmed';

interface SendContext {
  client: QueryClient;
  phone: string;
  /** The provisional row's id = the clientRequestId. */
  id: string;
  /** The chat's typed page read (use-thread's threadGet). */
  read: (path: string) => Promise<ThreadDetail>;
  /** A text from the chat box: only its retry may reuse the id (pinned-send). */
  box: boolean;
}

const cacheOf = (s: SendContext) => s.client.getQueryData<ThreadCache>(threadKey(s.phone));
const none = (): null => null;

/**
 * The send held with what it FIRST was (its provisional row) and the rows held before it; a retry
 * with the same id keeps the first one (an edit is never what the server may have).
 */
function hold(s: SendContext): HeldSend | undefined {
  const rows = threadMessages(cacheOf(s));
  const sent = rows.find((m) => m.id === s.id);
  // Its own provisional row included: it is never its own server row.
  const known = new Set(rows.map((m) => m.id));
  if (sent) holdSend(s.phone, { id: s.id, sent, known, box: s.box });
  return heldSends(s.phone).find((h) => h.id === s.id);
}

/**
 * The chat re-read after a send with no answer: the newest page folded in (mergeNewest keeps the
 * provisional row), then the server's row of this send, if it is there. A re-read that fails too
 * (still offline) finds nothing.
 */
async function confirmByReread(s: SendContext, held: HeldSend): Promise<MessageView | undefined> {
  const fresh = await s.read(threadPath(s.phone)).catch(none);
  if (!fresh) return undefined;
  s.client.setQueryData<ThreadCache>(threadKey(s.phone), (old) => mergeNewest(old, fresh));
  return sentRowOf(fresh.messages, held.sent, held.known);
}

/**
 * `post` (the send) with docs/44 BUG7's rule: the API's refusal (4xx) is thrown as it is; no
 * answer (deadline, network, 5xx) marks the bubble «unconfirmed», holds the send and re-reads the
 * chat. The server's row found there resolves it (the provisional row goes: the row is on
 * screen); not found, the error is thrown and the bubble stays «unconfirmed».
 */
export async function sendConfirmed(
  s: SendContext,
  post: () => Promise<MessageView>,
): Promise<MessageView> {
  try {
    return await post();
  } catch (error) {
    if (!isNoAnswer(error)) throw error;
    s.client.setQueryData<ThreadCache>(threadKey(s.phone), (old) => markUnconfirmed(old, s.id));
    const held = hold(s);
    const row = held && (await confirmByReread(s, held));
    if (!row) throw error;
    releaseSend(s.phone, s.id);
    s.client.setQueryData<ThreadCache>(threadKey(s.phone), (old) => dropRows(old, new Set([s.id])));
    return row;
  }
}
