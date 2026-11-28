import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import type { Lane, PassRun } from '@/modules/messaging/whatsapp/sender/drain';

/** A runOnce: its lane (absent = every row) and whether a kick started it. */
export interface PassOptions {
  lane?: Lane;
  kicked?: boolean;
}

export type SenderRun = PassRun & { lane?: Lane };

/** Module mode's pass: the run, its clock and the role's numbers (docs/23c). */
export interface NumbersPassInput {
  run: SenderRun;
  now: Date;
  numbers: readonly OverlayNumber[];
}

/** The role's numbers in module mode; null under legacy. */
export type PassNumbers = readonly OverlayNumber[] | null;
