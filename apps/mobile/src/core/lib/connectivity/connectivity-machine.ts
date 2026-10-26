// WhatsApp-like connection state without NetInfo (no native module: the app ships by OTA). The app
// only learns it is offline from a request that got no answer; it is back the moment anything answers.

export type Connectivity = 'online' | 'connecting';

export interface ConnState {
  status: Connectivity;
  /** When the current `connecting` began (ms epoch); null while online. */
  since: number | null;
  /** Failed probes since `connecting` began: the next wait is backoffMs(attempt). */
  attempt: number;
  /** False while the app is in the background: nothing probes then. */
  active: boolean;
  /** When the app last went to the background; null while in the foreground. */
  hiddenAt: number | null;
}

export type ConnEvent =
  | { type: 'networkFailure'; at: number }
  | { type: 'reached' }
  | { type: 'probeFailed' }
  | { type: 'background'; at: number }
  | { type: 'foreground' };

export const initialConnState: ConnState = { status: 'online', since: null, attempt: 0, active: true, hiddenAt: null };

/** Back in the foreground after longer than this, the app checks its connection once. */
export const AWAY_CHECK_MS = 30_000;
const FIRST_PROBE_MS = 1000;
const MAX_PROBE_MS = 30_000;

/** The wait before probe n (0-based): 1 s, 2 s, 4 s … capped at 30 s. */
export function backoffMs(attempt: number): number {
  return Math.min(FIRST_PROBE_MS * 2 ** attempt, MAX_PROBE_MS);
}

export function reduceConn(state: ConnState, event: ConnEvent): ConnState {
  switch (event.type) {
    case 'networkFailure':
      // An HTTP error is an answer, so only a request with no response at all lands here.
      return state.status === 'connecting' ? state : { ...state, status: 'connecting', since: event.at, attempt: 0 };
    case 'reached':
      return { ...state, status: 'online', since: null, attempt: 0 };
    case 'probeFailed':
      return state.status === 'connecting' ? { ...state, attempt: state.attempt + 1 } : state;
    case 'background':
      return { ...state, active: false, hiddenAt: event.at };
    case 'foreground':
      return { ...state, active: true, hiddenAt: null };
  }
}

/**
 * Back in the foreground: probe now while connecting (no waiting out the backoff); online, probe
 * once only after a long absence (the network may have gone while the phone slept).
 */
export function probeOnForeground(before: ConnState, now: number): boolean {
  if (before.active) return false;
  if (before.status === 'connecting') return true;
  return before.hiddenAt !== null && now - before.hiddenAt > AWAY_CHECK_MS;
}
