import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useBioLock } from '../core/bio-lock';
import type { BioKind } from '../core/device';
import { isCovering, type LockState, showsLock } from '../core/lock-machine';
import { BiometricOffer } from './BiometricOffer';
import { LockCover } from './LockCover';
import { LockScreen } from './LockScreen';

interface BiometricGateProps {
  /** The root's gate let a signed-in tree in: only then is there anything to lock. */
  signedIn: boolean;
  children: ReactNode;
}

/** Nothing under the lock reaches a screen reader. */
const hiddenWhile = (covering: boolean) =>
  ({
    accessibilityElementsHidden: covering,
    importantForAccessibility: covering ? 'no-hide-descendants' : 'auto',
  }) as const;

/** The lock screen proper, or the plain cover (reading the flag, backgrounded, signing out). */
function LockLayer({ kind, lock }: { kind: BioKind | null; lock: LockState }) {
  return showsLock(lock) ? <LockScreen kind={kind} failed={lock.failed} /> : <LockCover />;
}

/**
 * «الدخول بالبصمة» (owner 2026-11-15) around a signed-in app: the lock or its cover lies over the
 * tree (hidden from screen readers meanwhile), and the one-time offer after a fresh sign-in. With
 * the switch off (or no biometrics, or an APK without the module) it renders the app alone.
 */
export function BiometricGate({ signedIn, children }: BiometricGateProps) {
  const { lock, kind, offer } = useBioLock();
  const covering = signedIn && isCovering(lock);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} {...hiddenWhile(covering)}>
        {children}
      </View>
      {covering ? <LockLayer kind={kind} lock={lock} /> : null}
      {kind ? <BiometricOffer kind={kind} visible={signedIn && offer && !covering} /> : null}
    </View>
  );
}
