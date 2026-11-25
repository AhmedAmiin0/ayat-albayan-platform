/** Back from the background after this long, the lock comes back. */
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
  | { type: 'disabled' }
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
const isPrompting = (s: LockState) => s.phase === 'prompting';
const timedOut = (s: LockState, at: number) => at - (s.hiddenAt ?? at) >= LOCK_AFTER_MS;
const when = (ok: boolean, s: LockState, next: Partial<LockState>): LockState =>
  ok ? { ...s, ...next } : s;
const back = (s: LockState, at: number) =>
  when(s.phase === 'covered', s, timedOut(s, at) ? LOCKED : OPEN);
/** Left for the background during the prompt or the dissolve: covered, not open, after it. */
const afterPrompt = (s: LockState): Partial<LockState> =>
  s.hiddenAt === null ? OPEN : { phase: 'covered', failed: false };
/** Never open without a prompt: off, but the lock stays until the normal sign-in. */
const closed = (s: LockState): Partial<LockState> =>
  s.phase === 'open' ? OPEN : { phase: 'locked', failed: true };
const locksOut = (s: LockState) => s.phase === 'ended' || showsLock(s);

const handlers: Handlers = {
  loaded: (s, e) =>
    when(s.phase === 'checking', s, { enabled: e.enabled, ...(e.enabled ? LOCKED : OPEN) }),
  hide: (s, e) =>
    isOpenAndOn(s)
      ? { ...s, phase: 'covered', hiddenAt: e.at }
      : when(isPrompting(s), s, { hiddenAt: s.hiddenAt ?? e.at }),
  // Back while prompting (the iOS Face ID sheet passes through inactive): nothing was left.
  show: (s, e) => (isPrompting(s) ? { ...s, hiddenAt: null } : back(s, e.at)),
  prompt: (s) => when(s.phase === 'locked', s, { phase: 'prompting' }),
  success: (s) => when(isPrompting(s), s, afterPrompt(s)),
  fail: (s) => when(isPrompting(s), s, { phase: 'locked', failed: true, hiddenAt: null }),
  // Biometrics gone from the device: the flag goes; a covered app falls back to the sign-in.
  removed: (s) => ({ ...s, enabled: false, ...closed(s) }),
  // The settings switch off (the app is open there).
  disabled: (s) => ({ ...s, enabled: false }),
  enabled: (s) => ({ ...s, enabled: true }),
  // Never uncover a signed-in app on sign-out: it stays covered until the gate shows the sign-in.
  signedOut: (s) => ({ ...s, enabled: false, ...(s.phase === 'open' ? OPEN : { phase: 'ended' }) }),
  // A fresh sign-in (a password or code, never a restored session) is in: nothing to unlock.
  signedIn: (s) => when(locksOut(s), s, { enabled: false, ...OPEN }),
};

/** The biometric lock's transitions (pure; lock-store runs the prompts and the keystore). */
export function lockReducer(s: LockState, e: LockEvent): LockState {
  const handle = handlers[e.type] as (s: LockState, e: LockEvent) => LockState;
  return handle(s, e);
}

/** The lock (or its cover) lies over the app. */
export const isCovering = (s: LockState): boolean => s.phase !== 'open';

/** The lock screen proper (with its button), not the plain cover. */
export function showsLock(s: LockState): boolean {
  return s.phase === 'locked' || s.phase === 'prompting';
}
