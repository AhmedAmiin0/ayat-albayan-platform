import {
  backoffMs,
  type ConnEvent,
  type ConnState,
  initialConnState,
  probeOnForeground,
  reduceConn,
} from './connectivity-machine';

export interface ConnectivityDeps {
  /** One cheap request to the API: true when anything answered (any HTTP status). */
  probe: () => Promise<boolean>;
  /** TanStack's onlineManager in the app: offline pauses queries instead of burning retries. */
  setOnline: (online: boolean) => void;
  /** Injectable clock (tests); the timers are the global ones, so jest's fake timers drive them. */
  now?: () => number;
}

export interface ConnectivityStore {
  getState: () => ConnState;
  subscribe: (listener: () => void) => () => void;
  /** A request got no response at all (fetch rejected): not an HTTP error. */
  reportFailure: () => void;
  /** A request got an HTTP response, any status: the API is reachable. */
  reportReached: () => void;
  /** AppState: 'active' → true, 'background' → false. Nothing probes in the background. */
  setActive: (active: boolean) => void;
  /** «إعادة المحاولة»: probe now, skipping the rest of the backoff. */
  probeNow: () => void;
}

/** The connection state machine with its effects: the probe loop, onlineManager, listeners. */
export function createConnectivity(deps: ConnectivityDeps): ConnectivityStore {
  const now = deps.now ?? Date.now;
  const listeners = new Set<() => void>();
  let state = initialConnState;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let probing = false;

  const stopTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const dispatch = (event: ConnEvent) => {
    const before = state;
    state = reduceConn(state, event);
    if (before.status !== state.status) deps.setOnline(state.status === 'online');
    if (before !== state) listeners.forEach((listener) => listener());
  };
  const schedule = () => {
    stopTimer();
    if (state.status === 'connecting' && state.active) timer = setTimeout(probe, backoffMs(state.attempt));
  };
  async function probe(): Promise<void> {
    stopTimer();
    if (probing || !state.active) return;
    probing = true;
    const ok = await deps.probe().catch(() => false);
    probing = false;
    if (ok) return void (state.status === 'connecting' ? store.reportReached() : undefined);
    // Online, this was the foreground check: its failure is the one that starts `connecting`.
    if (state.status === 'online') return store.reportFailure();
    dispatch({ type: 'probeFailed' });
    schedule();
  }

  const store: ConnectivityStore = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    reportFailure: () => {
      if (state.status === 'connecting') return;
      dispatch({ type: 'networkFailure', at: now() });
      schedule();
    },
    reportReached: () => {
      stopTimer();
      dispatch({ type: 'reached' });
    },
    setActive: (active) => {
      if (active === state.active) return;
      if (!active) {
        stopTimer();
        return dispatch({ type: 'background', at: now() });
      }
      const check = probeOnForeground(state, now());
      dispatch({ type: 'foreground' });
      if (check) void probe();
    },
    probeNow: () => void probe(),
  };
  return store;
}
