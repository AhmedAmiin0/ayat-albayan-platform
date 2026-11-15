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
 * Each require sits in a try: an older APK without the modules gets null (the feature hides
 * itself) instead of a crash at boot. Each require is a literal, so Metro bundles it.
 */
function attempt<T>(load: () => T): T | null {
  try {
    return load();
  } catch {
    return null;
  }
}

let cached: BioNative | undefined;

export function bioNative(): BioNative {
  cached ??= {
    // oxlint-disable-next-line typescript/no-require-imports -- lazy native module (old APKs)
    auth: attempt(() => require('expo-local-authentication') as LocalAuth),
    // oxlint-disable-next-line typescript/no-require-imports -- lazy native module (old APKs)
    store: attempt(() => require('expo-secure-store') as SecureStore),
    // oxlint-disable-next-line typescript/no-require-imports -- lazy native module (old APKs)
    haptics: attempt(() => require('expo-haptics') as Haptics),
  };
  return cached;
}
