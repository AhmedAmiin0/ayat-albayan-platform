import type { StripDay } from '@ab/client-core';

export interface WeekStripProps {
  days: readonly StripDay[];
  selected: string | null;
  onJump: (day: string) => void;
}
