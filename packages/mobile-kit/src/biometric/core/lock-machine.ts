/** Back from the background after this long, the lock comes back (owner 2026-11-15). */
export const LOCK_AFTER_MS = 5 * 60_000;

/**
 * checking: the flag is being read (covered, never prompts). open: the app shows. covered: in the
 * background under the 5 minutes (the app-switcher snapshot sees the cover). locked: the lock
 * screen. prompting: the OS prompt is up, or the lock is dissolving. ended: signed out while
 * locked; covered until the gate shows the sign-in.
 */
export type LockPhase = 'checking' | 'open' | 'covered' | 'locked' | 'prompting' | 'ended';

export interface LockState {
  enabled: boolean;
  phase: LockPhase;
  /** When the app first left the foreground while open (ms). */
  hiddenAt: number | null;
  /** The last prompt was cancelled or failed: the lock waits for a tap, no automatic prompt. */
  failed: boolean;
}

export type LockEvent =
  | { type: 'loaded'; enabled: boolean }
  | { type: 'hide'; at: number }
  | { type: 'show'; at: number }
  | { type: 'prompt' }
  | { type: 'success' }
  | { type: 'fail' }
  | { type: 'removed' }
  | { type: 'enabled' }
  | { type: 'signedOut' }
  | { type: 'signedIn' };

type Handlers = {
  [K in LockEvent['type']]: (s: LockState, e: Extract<LockEvent, { type: K }>) => LockState;
};

export const INITIAL_LOCK: LockState = {
  enabled: false,
  phase: 'checking',
  hiddenAt: null,
  failed: false,
};

const OPEN: Pick<LockState, 'phase' | 'hiddenAt' | 'failed'> = {
  phase: 'open',
  hiddenAt: null,
  failed: false,
};
const LOCKED: Pick<LockState, 'phase' | 'hiddenAt' | 'failed'> = {
  phase: 'locked',
  hiddenAt: null,
  failed: false,
};

const isOpenAndOn = (s: LockState) => s.enabled && s.phase === 'open';
const timedOut = (s: LockState, at: number) => at - (s.hiddenAt ?? at) >= LOCK_AFTER_MS;
const when = (ok: boolean, s: LockState, next: Partial<LockState>): LockState =>
  ok ? { ...s, ...next } : s;

const handlers: Handlers = {
  loaded: (s, e) =>
    when(s.phase === 'checking', s, { enabled: e.enabled, ...(e.enabled ? LOCKED : OPEN) }),
  hide: (s, e) => when(isOpenAndOn(s), s, { phase: 'covered', hiddenAt: e.at }),
  show: (s, e) => when(s.phase === 'covered', s, timedOut(s, e.at) ? LOCKED : OPEN),
  prompt: (s) => when(s.phase === 'locked', s, { phase: 'prompting' }),
  success: (s) => when(s.phase === 'prompting', s, OPEN),
  fail: (s) => when(s.phase === 'prompting', s, { phase: 'locked', failed: true }),
  // Biometrics gone from the device: the lock turns itself off, the normal flow is back.
  removed: (s) => ({ ...s, enabled: false, ...OPEN }),
  enabled: (s) => ({ ...s, enabled: true }),
  // Never uncover a signed-in app on sign-out: it stays covered until the gate shows the sign-in.
  signedOut: (s) => ({ ...s, enabled: false, ...(s.phase === 'open' ? OPEN : { phase: 'ended' }) }),
  signedIn: (s) => when(s.phase === 'ended', s, OPEN),
};

/** The biometric lock's transitions (pure; lock-store runs the prompts and the keystore). */
export function lockReducer(s: LockState, e: LockEvent): LockState {
  const handle = handlers[e.type] as (s: LockState, e: LockEvent) => LockState;
  return handle(s, e);
}

/** The lock (or its cover) lies over the app. */
export const isCovering = (s: LockState): boolean => s.phase !== 'open';

/** The lock screen proper (with its button), not the plain cover. */
export const showsLock = (s: LockState): boolean => s.phase === 'locked' || s.phase === 'prompting';
