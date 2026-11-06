import { isNoAnswer } from '@ab/client-core';
import type { QueryClient } from '@tanstack/react-query';
import { refreshInbox, refreshLists } from '@/inbox/thread/hooks/inbox-sync';
import { removeMessage, type ThreadCache } from '@/inbox/thread/hooks/thread-cache';

/** A send that ended with no answer (TanStack passes null on success). */
export const unanswered = (error: unknown): boolean => error !== null && isNoAnswer(error);

/**
 * A send's rollback: the API refused it, so its provisional row goes; a send with no answer keeps
 * its row («unconfirmed», sendConfirmed marked it), because the server may have it.
 */
export const rollback = (error: unknown, id: string) => (old: ThreadCache | undefined) =>
  unanswered(error) ? old : removeMessage(old, id);

/**
 * After a send: an answer (the row or a refusal) re-reads the chat and the lists. No answer
 * re-reads only the lists: sendConfirmed already re-read the chat, and a full read now would drop
 * the «unconfirmed» bubble before the retry.
 */
export function afterSend(client: QueryClient, phone: string, error: unknown): Promise<void> {
  if (!unanswered(error)) return refreshInbox(client, phone);
  refreshLists(client);
  return Promise.resolve();
}
