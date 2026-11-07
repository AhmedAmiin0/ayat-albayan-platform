/**
 * The realtime channel's rejoin after a drop (docs/44 K2, owner 2026-11-07: «like Kapso, a
 * green/red dot and a reconnect with backoff»): 1 s, 2 s, 5 s, 10 s, then every 30 s until it is
 * SUBSCRIBED again. A resume or the network coming back rejoins at once (now()).
 */
export const REJOIN_STEPS_MS: readonly number[] = [1_000, 2_000, 5_000, 10_000];
/** After the steps: one try every 30 s for as long as it stays down. */
export const REJOIN_STEADY_MS = 30_000;

/** The wait before the rejoin number `attempt` (0 = the first after a drop). */
export const rejoinDelayMs = (attempt: number): number =>
  REJOIN_STEPS_MS[attempt] ?? REJOIN_STEADY_MS;

/** The statuses supabase-js reports for a channel that is no longer joined. */
const DROPPED: ReadonlySet<string> = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']);

/** A channel status that calls for a rejoin. */
export const isDropped = (status: string): boolean => DROPPED.has(status);

/** Whether the live dot is green (the channel is SUBSCRIBED) or not. */
export type LiveDotState = 'on' | 'off';

export const liveDotState = (live: boolean): LiveDotState => (live ? 'on' : 'off');

export interface Rejoin {
  /** The channel dropped: a rejoin after the next step of the backoff (one pending at most). */
  dropped(): void;
  /** Resume / online: a pending rejoin runs now (nothing pending: nothing to do). */
  now(): void;
  /** SUBSCRIBED again: the backoff starts over at 1 s. */
  joined(): void;
  /** For good (stop): no rejoin after this. */
  cancel(): void;
}

/** One rejoin timer around `join` (which must open a fresh channel). */
export function createRejoin(join: () => void): Rejoin {
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const run = () => {
    clear();
    join();
  };
  return {
    dropped() {
      if (timer) return;
      timer = setTimeout(run, rejoinDelayMs(attempt));
      attempt += 1;
    },
    now() {
      if (timer) run();
    },
    joined() {
      attempt = 0;
      clear();
    },
    cancel: clear,
  };
}
