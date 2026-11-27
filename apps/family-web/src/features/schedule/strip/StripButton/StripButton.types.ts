import type { StripDay } from '@ab/client-core';

export interface StripButtonProps {
  day: StripDay;
  selected: boolean;
  onJump: (day: string) => void;
}
