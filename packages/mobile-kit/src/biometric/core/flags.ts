import type { BioNative } from './native';

// SecureStore keys (letters, digits, «.», «-», «_»). Only flags: the session stays where it is.
const ENABLED = 'ab.biometric.enabled';
const DECLINED = 'ab.biometric.declined';
const YES = '1';

/** Stored in the OS keystore. */
export interface BioFlags {
  enabled: () => Promise<boolean>;
  declined: () => Promise<boolean>;
  setEnabled: (on: boolean) => Promise<void>;
  setDeclined: () => Promise<void>;
}

/** Never throws: a keystore error reads as «off» and a failed write is dropped. */
export function bioFlags(native: BioNative): BioFlags {
  const store = native.store;
  const read = async (key: string) => (await store?.getItemAsync(key).catch(() => null)) === YES;
  const write = async (key: string, on: boolean) => {
    const done = on ? store?.setItemAsync(key, YES) : store?.deleteItemAsync(key);
    await done?.catch(() => undefined);
  };
  return {
    enabled: () => read(ENABLED),
    declined: () => read(DECLINED),
    setEnabled: (on) => write(ENABLED, on),
    setDeclined: () => write(DECLINED, true),
  };
}
