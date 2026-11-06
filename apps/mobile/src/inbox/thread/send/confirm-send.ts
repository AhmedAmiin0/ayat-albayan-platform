import { isNoAnswer } from '@ab/client-core';
import type { MessageView, ThreadDetail } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import {
  mergeNewest,
  removeMessage,
  type ThreadCache,
  threadKey,
  threadMessages,
  threadPath,
} from '@/inbox/thread/hooks/thread-cache';
import { pinSend } from './pinned-send';
import { markUnconfirmed, sentRowOf } from './unconfirmed';

interface SendContext {
  client: QueryClient;
  phone: string;
  /** The provisional row's id = the clientRequestId. */
  id: string;
  /** The chat's typed page read (use-thread's threadGet). */
  read: (path: string) => Promise<ThreadDetail>;
}

const cacheOf = (s: SendContext) => s.client.getQueryData<ThreadCache>(threadKey(s.phone));
const none = (): null => null;

/**
 * The chat re-read after a send with no answer: the newest page folded in (mergeNewest keeps the
 * provisional row), then the server's row of this send, if it is there. A re-read that fails too
 * (still offline) finds nothing.
 */
async function confirmByReread(s: SendContext): Promise<MessageView | undefined> {
  const held = threadMessages(cacheOf(s));
  const sent = held.find((m) => m.id === s.id);
  const fresh = await s.read(threadPath(s.phone)).catch(none);
  if (!fresh || !sent) return undefined;
  s.client.setQueryData<ThreadCache>(threadKey(s.phone), (old) => mergeNewest(old, fresh));
  return sentRowOf(fresh.messages, sent, new Set(held.map((m) => m.id)));
}

/**
 * `post` (the send) with docs/44 BUG7's rule: the API's refusal is thrown as it is; no answer
 * marks the bubble «unconfirmed», pins the id for the chat's next send and re-reads the chat. The
 * server's row found there resolves the send (the provisional row goes: the row is on screen);
 * not found, the no-answer error is thrown and the bubble stays «unconfirmed».
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
    pinSend(s.phone, s.id);
    const row = await confirmByReread(s);
    if (!row) throw error;
    s.client.setQueryData<ThreadCache>(threadKey(s.phone), (old) => removeMessage(old, s.id));
    return row;
  }
}
