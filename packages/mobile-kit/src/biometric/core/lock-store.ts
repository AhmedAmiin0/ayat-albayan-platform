import { authenticate, type BioKind, type BioOutcome, enrolledKind } from './device';
import type { BioFlags } from './flags';
import { INITIAL_LOCK, type LockEvent, lockReducer, type LockState } from './lock-machine';
import type { BioNative } from './native';

export interface BioSnapshot {
  lock: LockState;
  /** The device's method, once known (null: no biometrics, the feature hides). */
  kind: BioKind | null;
  /** «استخدم البصمة للدخول في المرة القادمة؟» is waiting (a fresh sign-in, never declined). */
  offer: boolean;
}

export interface BioText {
  reason: string;
  enableReason: string;
  cancel: string;
}

export interface BioLockDeps {
  native: BioNative;
  flags: BioFlags;
  /** The OS prompt's words, read when it opens (the i18n bundle). */
  text: () => BioText;
}

type Listener = () => void;

/**
 * The biometric lock (lock-machine + the native prompt + the keystore flags). One per app, made by
 * bio-lock; tests build their own with mocked natives. Arrow fields: passed around unbound.
 */
export class BioLockStore {
  private snap: BioSnapshot = { lock: INITIAL_LOCK, kind: null, offer: false };
  private readonly listeners = new Set<Listener>();

  private readonly deps: BioLockDeps;

  constructor(deps: BioLockDeps) {
    this.deps = deps;
  }

  getSnapshot = (): BioSnapshot => this.snap;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  /** Reads the flag and the device: a flag whose biometrics are gone turns itself off. */
  boot = async (): Promise<void> => {
    const [on, kind] = await Promise.all([
      this.deps.flags.enabled(),
      enrolledKind(this.deps.native),
    ]);
    this.set({ kind });
    this.send({ type: 'loaded', enabled: on && kind !== null });
    if (on && !kind) await this.deps.flags.setEnabled(false);
  };

  /** The lock's button and its automatic prompt: the OS prompt, then a haptic either way. */
  unlock = async (): Promise<BioOutcome | 'busy'> => {
    if (this.snap.lock.phase !== 'locked') return 'busy';
    this.send({ type: 'prompt' });
    const { reason, cancel } = this.deps.text();
    const result = await authenticate(this.deps.native, { reason, cancel });
    this.outcome[result]();
    return result;
  };

  /** Automatic prompt as the lock shows: once per lock, never again after a cancel. */
  autoPrompt = async (): Promise<BioOutcome | 'busy'> =>
    this.snap.lock.failed ? 'busy' : this.unlock();

  /** The lock dissolved: the app is open. */
  finish = (): void => this.send({ type: 'success' });

  /** «تفعيل» and the settings switch: one biometric confirmation first, then the flag. */
  enable = async (): Promise<boolean> => {
    const { enableReason, cancel } = this.deps.text();
    const result = await authenticate(this.deps.native, { reason: enableReason, cancel });
    const ok = result === 'success';
    this.feel(ok);
    if (ok) await this.deps.flags.setEnabled(true);
    this.set({
      offer: false,
      lock: ok ? lockReducer(this.snap.lock, { type: 'enabled' }) : this.snap.lock,
    });
    return ok;
  };

  /** The settings switch off: the flag goes, the app stays as it is. */
  disable = (): void => {
    this.send({ type: 'removed' });
    void this.deps.flags.setEnabled(false);
  };

  /** «ليس الآن»: never offered again on this device. */
  decline = (): void => {
    this.set({ offer: false });
    void this.deps.flags.setDeclined();
  };

  /** A fresh sign-in: offer once, if the device can and nobody said «ليس الآن» on it. */
  signedIn = async (): Promise<void> => {
    this.send({ type: 'signedIn' });
    const [declined, kind] = await Promise.all([
      this.deps.flags.declined(),
      enrolledKind(this.deps.native),
    ]);
    this.set({ kind, offer: !declined && !this.snap.lock.enabled && kind !== null });
  };

  /** Every sign-out path (the button, «الدخول بطريقة أخرى», a refused refresh) clears the flag. */
  signedOut = (): void => {
    this.set({ offer: false, lock: lockReducer(this.snap.lock, { type: 'signedOut' }) });
    void this.deps.flags.setEnabled(false);
  };

  hide = (at: number): void => this.send({ type: 'hide', at });

  show = (at: number): void => this.send({ type: 'show', at });

  private readonly outcome: Record<BioOutcome, () => void> = {
    // Stays 'prompting' while the lock dissolves; finish() opens the app.
    success: () => this.feel(true),
    fail: () => {
      this.feel(false);
      this.send({ type: 'fail' });
    },
    removed: this.disable,
  };

  private feel(ok: boolean): void {
    const haptics = this.deps.native.haptics;
    const type = haptics?.NotificationFeedbackType[ok ? 'Success' : 'Error'];
    void haptics?.notificationAsync(type).catch(() => undefined);
  }

  private send(event: LockEvent): void {
    this.set({ lock: lockReducer(this.snap.lock, event) });
  }

  private set(next: Partial<BioSnapshot>): void {
    this.snap = { ...this.snap, ...next };
    this.listeners.forEach((listener) => listener());
  }
}
