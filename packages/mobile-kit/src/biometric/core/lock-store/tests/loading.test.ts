import type { BioFlags } from '../../flags';
import { INITIAL_LOCK } from '../../lock-machine';
import { BioLockStore } from '../lock-store';
import type { BioNative } from '../../native';

// The native modules load after the store is made (dynamic import): it waits, never guesses.

const flags: BioFlags = {
  enabled: async () => true,
  declined: async () => false,
  setEnabled: jest.fn(async () => undefined),
  setDeclined: async () => undefined,
};
const text = () => ({ reason: 'R', enableReason: 'E', cancel: 'C' });

test('boot waits for the modules; an old APK without them reads as «no biometrics»', async () => {
  let loaded: (n: BioNative) => void = () => undefined;
  const native = new Promise<BioNative>((resolve) => (loaded = resolve));
  const lock = new BioLockStore({ native, flags, text });
  const booting = lock.boot();
  await Promise.resolve();
  expect(lock.getSnapshot().lock).toBe(INITIAL_LOCK);
  loaded({ auth: null, store: null, haptics: null });
  await booting;
  expect(lock.getSnapshot().kind).toBeNull();
  expect(lock.getSnapshot().lock.enabled).toBe(false);
  expect(flags.setEnabled).toHaveBeenCalledWith(false);
});
