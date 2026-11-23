import type { BioKind } from './device';
import type { BioFlags } from './flags';
import type { LockState } from './lock-machine';
import type { BioNative } from './native';

export interface BioSnapshot {
  lock: LockState;
  /** The device's method, once known (null: no biometrics, the feature hides). */
  kind: BioKind | null;
  /** Offered only after a fresh sign-in when never declined. */
  offer: boolean;
}

interface BioText {
  reason: string;
  enableReason: string;
  cancel: string;
}

export interface BioLockDeps {
  native: BioNative;
  flags: BioFlags;
  /** The OS prompt's words, read when it opens (the i18n bundle). */
  text: () => BioText;
}
