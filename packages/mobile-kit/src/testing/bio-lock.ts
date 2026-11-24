import { useSyncExternalStore } from 'react';
import type { BioFlags } from '../biometric/core/flags';
import type { BioSnapshot } from '../biometric/core/lock-deps';
import { BioLockStore } from '../biometric/core/lock-store';
import type { BioNative } from '../biometric/core/native';

// Test-only: the biometric lock with its native modules mocked. Use it as the bio-lock module:
// jest.mock('…/core/bio-lock', () => jest.requireActual('…/testing/bio-lock').bioLockMock).

type Answer = { success: true } | { success: false; error: string };

const flags = { on: false, declined: false };
let types = [1];
const auth = {
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => types),
  authenticateAsync: jest.fn<Promise<Answer>, []>(async () => ({ success: true })),
};
const native = { auth, store: null, haptics: null } as unknown as BioNative;
const bioFlags: BioFlags = {
  enabled: async () => flags.on,
  declined: async () => flags.declined,
  setEnabled: async (on) => void (flags.on = on),
  setDeclined: async () => void (flags.declined = true),
};
const make = () =>
  new BioLockStore({
    native: Promise.resolve(native),
    flags: bioFlags,
    text: () => ({ reason: 'R', enableReason: 'E', cancel: 'C' }),
  });

/** The current store; reset() swaps in a fresh one, bioLock always reaches the current. */
const fake = { lock: make() };

const bioLock = {
  getSnapshot: () => fake.lock.getSnapshot(),
  subscribe: (l: () => void) => fake.lock.subscribe(l),
  unlock: () => fake.lock.unlock(),
  autoPrompt: () => fake.lock.autoPrompt(),
  finish: () => fake.lock.finish(),
  enable: () => fake.lock.enable(),
  disable: () => fake.lock.disable(),
  decline: () => fake.lock.decline(),
};

function useBioLock(): BioSnapshot {
  return useSyncExternalStore(bioLock.subscribe, bioLock.getSnapshot);
}

/** A new store (still 'checking'), the flags cleared and the prompt answering yes. */
function reset(): void {
  Object.assign(flags, { on: false, declined: false });
  types = [1];
  auth.authenticateAsync.mockReset().mockResolvedValue({ success: true });
  auth.isEnrolledAsync.mockReset().mockResolvedValue(true);
  fake.lock = make();
}

/** The flag read: as at app start with this flag and these methods. */
interface BootOptions {
  enabled: boolean;
  types?: number[];
  enrolled?: boolean;
}

async function boot(opts: BootOptions): Promise<void> {
  flags.on = opts.enabled;
  auth.isEnrolledAsync.mockResolvedValue(opts.enrolled ?? true);
  types = opts.types ?? [1];
  await fake.lock.boot();
}

/** What the mocked bio-lock module exports (bioLock, useBioLock) and the test's handles. */
export const bioLockMock = { bioLock, useBioLock, fake, auth, reset, boot };
