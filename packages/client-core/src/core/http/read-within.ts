import { type StallStage, withDeadline } from './deadline.js';
import { isRead, READ_TIMEOUT_MS } from './timeouts.js';

export interface ReadDeadline {
  /** Default READ_TIMEOUT_MS; readTimeoutFor(path) gives a slow read more. */
  timeoutMs?: number | undefined;
  /** Mobile tells its connection state (stall-report); web has nothing to tell. */
  onTimeout?: ((stage: StallStage) => void) | undefined;
}

const ignore = (): void => undefined;

/**
 * The read deadline around a transport (web and mobile, docs/43 AU9): a read (GET) that has not
 * settled within the deadline, token included, rejects as no answer (`TypeError`) and calls
 * `onTimeout` once; the caller's signal (TanStack's) still cancels it. Writes pass through (apiSend
 * has its own deadline).
 */
export function withReadDeadline<T>(
  send: (init: RequestInit) => Promise<T>,
  init: RequestInit = {},
  opts: ReadDeadline = {},
): Promise<T> {
  if (!isRead(init)) return send(init);
  const read = (signal: AbortSignal) => send({ ...init, signal });
  const timeoutMs = opts.timeoutMs ?? READ_TIMEOUT_MS;
  const onTimeout = opts.onTimeout ?? ignore;
  return withDeadline(read, { signal: init.signal, onTimeout, timeoutMs });
}
