import type { ReactNode } from 'react';

export interface BiometricGateProps {
  /** The root's gate let a signed-in tree in: only then is there anything to lock. */
  signedIn: boolean;
  children: ReactNode;
}
