import type { GateStatus } from '@/core/auth';

/** A guardian or a student is in (the gate gives only those, or booting / out, in this app). */
export const isFamilySignedIn = (gate: GateStatus): boolean => gate !== 'booting' && gate !== 'out';
