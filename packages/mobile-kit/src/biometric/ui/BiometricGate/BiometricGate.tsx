import { View } from 'react-native';
import { BiometricOffer } from '../BiometricOffer';
import type { BiometricGateProps } from './BiometricGate.types';
import { hiddenWhile } from './biometric-gate.helpers';
import { LockLayer } from './LockLayer';
import { useBiometricGate } from './use-biometric-gate';

/** The lock covers the tree, hidden from screen readers; without the switch it renders the app. */
export function BiometricGate({ signedIn, children }: BiometricGateProps) {
  const { lock, kind, offer, covering } = useBiometricGate({ signedIn });
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
