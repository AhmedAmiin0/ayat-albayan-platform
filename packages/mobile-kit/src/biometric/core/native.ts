import type * as HapticsModule from 'expo-haptics';
import type * as LocalAuthModule from 'expo-local-authentication';
import type * as SecureStoreModule from 'expo-secure-store';

type LocalAuth = typeof LocalAuthModule;
type SecureStore = typeof SecureStoreModule;
type Haptics = typeof HapticsModule;

/** The three native modules, each null where this binary lacks it (an APK built before them). */
export interface BioNative {
  auth: LocalAuth | null;
  store: SecureStore | null;
  haptics: Haptics | null;
}

/*
 * These modules call requireNativeModule at import time: on an older APK without them the import
 * rejects and that one module is null (the feature hides itself) instead of a crash at boot.
 */
const orNull = <T>(load: Promise<T>): Promise<T | null> => load.catch(() => null);

async function load(): Promise<BioNative> {
  const [auth, store, haptics] = await Promise.all([
    orNull(import('expo-local-authentication')),
    orNull(import('expo-secure-store')),
    orNull(import('expo-haptics')),
  ]);
  return { auth, store, haptics };
}

let cached: Promise<BioNative> | undefined;

export function bioNative(): Promise<BioNative> {
  cached ??= load();
  return cached;
}
