import type { Palette } from '../../../theme';
import type { StepState } from '@ab/client-core';

/** Each state's circle and ink: done green, current brand, pending sunk. */
export const TONE: Readonly<Record<StepState, { fill: keyof Palette; ink: keyof Palette }>> = {
  done: { fill: 'okSoft', ink: 'ok' },
  current: { fill: 'lapisWash', ink: 'lapis' },
  pending: { fill: 'sunk', ink: 'ink3' },
};

export const CHECK = 'm5 12.5 4.5 4.5L19 7';

export const CLOCK = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2';
