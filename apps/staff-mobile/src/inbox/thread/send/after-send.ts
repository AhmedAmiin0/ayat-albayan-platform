import { isNoAnswer } from '@ab/client-core';
import { removeMessage, type ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { markUnconfirmed } from './unconfirmed';

/** A send that ended with no answer (TanStack passes null on success). */
export const unanswered = (error: unknown): boolean => error !== null && isNoAnswer(error);

/**
 * A send's rollback: the API refused it (4xx), so its provisional row goes; a send with no answer
 * keeps its row, marked «unconfirmed», because the server may have it.
 */
export const rollback = (error: unknown, id: string) => (old: ThreadCache | undefined) =>
  unanswered(error) ? markUnconfirmed(old, id) : removeMessage(old, id);
