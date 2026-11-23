import { authenticate, type BioOutcome, enrolledKind, feel } from '../device';
import type { BioLockDeps, BioSnapshot } from '../lock-deps';
import { INITIAL_LOCK, type LockEvent, lockReducer } from '../lock-machine';

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

  /** Gone biometrics turn the flag off but never open the app: the lock fails closed. */
  boot = async (): Promise<void> => {
    const [on, kind] = await Promise.all([
      this.deps.flags.enabled(),
      enrolledKind(this.deps.native),
    ]);
    this.set({ kind });
    this.send({ type: 'loaded', enabled: on });
    if (on && !kind) this.removed();
  };

  /** The lock's button and its automatic prompt: the OS prompt, then a haptic either way. */
  unlock = async (): Promise<BioOutcome | 'busy'> => {
    if (this.snap.lock.phase !== 'locked') return 'busy';
    this.send({ type: 'prompt' });
    const { reason, cancel } = this.deps.text();
    const raw = await authenticate(this.deps.native, { reason, cancel });
    // «unavailable» can be passing (a busy sensor): removed only when the device says so again.
    const gone = raw === 'removed' && (await enrolledKind(this.deps.native)) === null;
    const result: BioOutcome = gone || raw === 'success' ? raw : 'fail';
    feel(this.deps.native, result === 'success');
    this.outcome[result]();
    return result;
  };

  /** Automatic prompt as the lock shows: once per lock, never again after a cancel. */
  autoPrompt = async (): Promise<BioOutcome | 'busy'> =>
    this.snap.lock.failed ? 'busy' : this.unlock();

  /** The lock dissolved: the app is open. */
  finish = (): void => this.send({ type: 'success' });

  /** One biometric confirmation first, then the flag. */
  enable = async (): Promise<boolean> => {
    const { enableReason, cancel } = this.deps.text();
    const result = await authenticate(this.deps.native, { reason: enableReason, cancel });
    const ok = result === 'success';
    feel(this.deps.native, ok);
    if (ok) await this.deps.flags.setEnabled(true);
    this.set({
      offer: false,
      lock: ok ? lockReducer(this.snap.lock, { type: 'enabled' }) : this.snap.lock,
    });
    return ok;
  };

  /** The settings switch off: the flag goes, the app stays as it is. */
  disable = (): void => {
    this.send({ type: 'disabled' });
    void this.deps.flags.setEnabled(false);
  };

  /** Never offered again on this device. */
  decline = (): void => {
    this.set({ offer: false });
    void this.deps.flags.setDeclined();
  };

  /** Offer once, if the device can and nobody declined on it. */
  signedIn = async (): Promise<void> => {
    const wasOn = this.snap.lock.enabled;
    this.send({ type: 'signedIn' });
    // A flag left by a killed sign-out: the new sign-in clears it (and is offered again).
    if (wasOn && !this.snap.lock.enabled) await this.deps.flags.setEnabled(false);
    const [declined, on, kind] = await Promise.all([
      this.deps.flags.declined(),
      this.deps.flags.enabled(),
      enrolledKind(this.deps.native),
    ]);
    this.set({ kind, offer: !declined && !on && kind !== null });
  };

  /** Every sign-out path clears the flag. */
  signedOut = (): void => {
    this.set({ offer: false, lock: lockReducer(this.snap.lock, { type: 'signedOut' }) });
    void this.deps.flags.setEnabled(false);
  };

  hide = (at: number): void => this.send({ type: 'hide', at });

  show = (at: number): void => this.send({ type: 'show', at });

  private readonly outcome: Record<BioOutcome, () => void> = {
    // Stays 'prompting' while the lock dissolves; finish() opens the app.
    success: () => undefined,
    fail: () => this.send({ type: 'fail' }),
    removed: () => this.removed(),
  };

  private removed(): void {
    this.set({ kind: null, lock: lockReducer(this.snap.lock, { type: 'removed' }) });
    void this.deps.flags.setEnabled(false);
  }

  private send(event: LockEvent): void {
    this.set({ lock: lockReducer(this.snap.lock, event) });
  }

  private set(next: Partial<BioSnapshot>): void {
    this.snap = { ...this.snap, ...next };
    this.listeners.forEach((listener) => listener());
  }
}
