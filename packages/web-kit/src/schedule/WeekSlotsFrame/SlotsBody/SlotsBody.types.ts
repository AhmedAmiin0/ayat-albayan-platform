import type { SlotGridProps } from '@ab/web-kit/schedule/SlotGrid';
import type { SlotsRead } from '@ab/web-kit/schedule/WeekSlotsFrame';

export interface SlotsBodyProps {
  read: SlotsRead;
  grid: Omit<SlotGridProps, 'slots'>;
}
