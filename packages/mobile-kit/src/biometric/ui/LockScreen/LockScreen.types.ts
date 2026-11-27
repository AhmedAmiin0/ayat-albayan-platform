import type { BioKind } from '../../core/device';

export interface LockScreenProps {
  /** Null means biometrics are gone; only the other sign-in way is left (fails closed). */
  kind: BioKind | null;
  /** The last prompt was cancelled or failed: say so, wait for a tap. */
  failed: boolean;
}
