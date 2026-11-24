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

/** The lock covers the tree, hidden from screen readers; without the switch it renders the app. */
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
