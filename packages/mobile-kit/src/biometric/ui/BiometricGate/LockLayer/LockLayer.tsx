import type { BioKind } from '../../../core/device';
import { type LockState, showsLock } from '../../../core/lock-machine';
import { LockCover } from '../../LockCover';
import { LockScreen } from '../../LockScreen';

/** The lock screen proper, or the plain cover (reading the flag, backgrounded, signing out). */
export function LockLayer({ kind, lock }: { kind: BioKind | null; lock: LockState }) {
  return showsLock(lock) ? <LockScreen kind={kind} failed={lock.failed} /> : <LockCover />;
}
