import type { BioNative } from './native';

export type BioKind = 'fingerprint' | 'face' | 'iris';

/** One prompt's answer: in, said no / failed, or the biometrics are gone from the device. */
export type BioOutcome = 'success' | 'fail' | 'removed';

// AuthenticationType: 1 fingerprint, 2 face, 3 iris (expo-local-authentication).
const KIND_OF: Record<number, BioKind> = { 1: 'fingerprint', 2: 'face', 3: 'iris' };

// No biometrics left on the device (or no screen lock): the lock turns itself off.
const REMOVED = new Set(['not_enrolled', 'not_available', 'passcode_not_set']);
const failure = (error: string): BioOutcome => (REMOVED.has(error) ? 'removed' : 'fail');

/** Face first when a phone has both (Face ID is what its owner uses). */
const pickKind = (types: number[]): BioKind =>
  KIND_OF[types.includes(2) ? 2 : (types[0] ?? 1)] ?? 'fingerprint';

/**
 * The device's enrolled method, or null: no module (an old APK), no hardware, nothing enrolled,
 * or the check threw.
 */
export async function enrolledKind(native: BioNative): Promise<BioKind | null> {
  const auth = native.auth;
  if (!auth) return null;
  try {
    const ready = (await auth.hasHardwareAsync()) && (await auth.isEnrolledAsync());
    return ready ? pickKind(await auth.supportedAuthenticationTypesAsync()) : null;
  } catch {
    return null;
  }
}

interface PromptText {
  reason: string;
  cancel: string;
}

/** The OS biometric prompt (the device passcode stays the OS's own fallback). */
export async function authenticate(native: BioNative, text: PromptText): Promise<BioOutcome> {
  const auth = native.auth;
  if (!auth) return 'removed';
  try {
    const r = await auth.authenticateAsync({
      promptMessage: text.reason,
      cancelLabel: text.cancel,
    });
    return r.success ? 'success' : failure(r.error);
  } catch {
    return 'fail';
  }
}

/** A success / error haptic (none without the module). */
export function feel(native: BioNative, ok: boolean): void {
  const haptics = native.haptics;
  const type = haptics?.NotificationFeedbackType[ok ? 'Success' : 'Error'];
  void haptics?.notificationAsync(type).catch(() => undefined);
}
