/** Where a timed-out request stood: still waiting for the access token, or sent and unanswered. */
export type StallStage = 'token' | 'fetch';

const sending = new WeakMap<AbortSignal, true>();

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
  signal?: AbortSignal | null | undefined;
  /** Called once when the deadline passes, with where the request stood. */
  onTimeout: (stage: StallStage) => void;
  timeoutMs: number;
}

/**
 * Runs `run` with its own AbortController (the caller's signal merged in) and rejects with
 * noAnswer() when it has not settled within the deadline, even if `run` never looks at the signal
 * (a token refresh that hangs). No AbortSignal.timeout/any: React Native lacks them.
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
    }, opts.timeoutMs);
    caller?.addEventListener('abort', cancel);
    if (caller?.aborted) {
      cancel();
      return;
    }
    run(abort.signal).then(resolve, reject).finally(done);
  });
}
