import { useBioLock } from '../../core/bio-lock';
import { isCovering } from '../../core/lock-machine';
import type { BiometricGateProps } from './BiometricGate.types';

export function useBiometricGate({ signedIn }: Pick<BiometricGateProps, 'signedIn'>) {
  const { lock, kind, offer } = useBioLock();
  const covering = signedIn && isCovering(lock);
  return { lock, kind, offer, covering };
}
