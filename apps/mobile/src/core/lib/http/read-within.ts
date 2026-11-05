import { isRead, READ_TIMEOUT_MS, withDeadline } from './read-deadline';
import { reportStall } from './stall-report';

/**
 * The read deadline around a transport: a read (GET) that has not settled within the deadline,
 * token included, rejects as no answer (`TypeError`) and tells the connection state once; writes
 * and uploads keep no deadline. apiFetch uses it, and the flow tests' fake backend too.
 */
export function withReadDeadline<T>(
  send: (init: RequestInit) => Promise<T>,
  init: RequestInit = {},
  timeoutMs = READ_TIMEOUT_MS,
): Promise<T> {
  if (!isRead(init)) return send(init);
  const read = (signal: AbortSignal) => send({ ...init, signal });
  return withDeadline(read, { signal: init.signal, onTimeout: reportStall, timeoutMs });
}
