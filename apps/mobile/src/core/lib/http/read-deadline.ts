/**
 * A read that has not settled by now counts as no answer (owner 2026-11-05: a chat read stuck
 * across a background/resume pinned the chats list and the open chat to the saved copy, with no
 * error). The deadline covers the whole request, the access token included.
 */
export const READ_TIMEOUT_MS = 20_000;

/**
 * Reads the API answers slowly by design: a chat file (signed, `?download=1` too) or a PDF page,
 * which the API may first fetch from Meta or the CRM, then render (the renderer alone allows 45 s).
 */
export const SLOW_READ_TIMEOUT_MS = 120_000;
const SLOW_READS = [/^\/threads\/[^/?]+\/messages\/[^/?]+\/(file|pdf\/\d+)(\?|$)/];

/** The deadline for a read of this API path. */
export const readTimeoutFor = (path: string): number =>
  SLOW_READS.some((slow) => slow.test(path)) ? SLOW_READ_TIMEOUT_MS : READ_TIMEOUT_MS;

/** Where a timed-out request stood: still waiting for the access token, or sent and unanswered. */
export type StallStage = 'token' | 'fetch';

const READS = new Set(['GET', 'HEAD']);
const sending = new WeakMap<AbortSignal, true>();

/** GET or HEAD (fetch's default): the only requests apiFetch puts a read deadline on. */
export const isRead = (init: RequestInit = {}): boolean =>
  READS.has((init.method ?? 'GET').toUpperCase());

/** The transport calls this as it sends: past the token, a stall is the network's. */
export function markSending(signal: AbortSignal | null | undefined): void {
  if (signal) sending.set(signal, true);
}

const stageOf = (signal: AbortSignal): StallStage => (sending.has(signal) ? 'fetch' : 'token');

/** What React Native's fetch rejects with when no answer came: isNetworkError says offline. */
export const noAnswer = (): TypeError => new TypeError('Network request failed');

const aborted = (): Error => Object.assign(new Error('Aborted'), { name: 'AbortError' });

interface DeadlineOptions {
  /** The caller's own signal (TanStack's): its abort ends the request at once, never a stall. */
  signal?: AbortSignal | null;
  /** Called once when the deadline passes, with where the request stood. */
  onTimeout: (stage: StallStage) => void;
  timeoutMs?: number;
}

/**
 * Runs `run` with its own AbortController (the caller's signal merged in, like probe.ts) and
 * rejects with noAnswer() when it has not settled within the deadline, even if `run` never looks
 * at the signal (a token refresh that hangs). No AbortSignal.timeout/any: React Native lacks them.
 */
export function withDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  opts: DeadlineOptions,
): Promise<T> {
  const abort = new AbortController();
  const caller = opts.signal;
  return new Promise<T>((resolve, reject) => {
    function done(): void {
      clearTimeout(timer);
      caller?.removeEventListener('abort', cancel);
    }
    function end(error: Error): void {
      done();
      abort.abort();
      reject(error);
    }
    function cancel(): void {
      end(aborted());
    }
    const timer = setTimeout(() => {
      opts.onTimeout(stageOf(abort.signal));
      end(noAnswer());
    }, opts.timeoutMs ?? READ_TIMEOUT_MS);
    caller?.addEventListener('abort', cancel);
    if (caller?.aborted) {
      cancel();
      return;
    }
    run(abort.signal).then(resolve, reject).finally(done);
  });
}
