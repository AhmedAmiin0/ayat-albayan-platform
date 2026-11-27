import type { GridDay, SlotGridProps } from '@ab/web-kit/schedule/SlotGrid';

export interface SlotDayProps extends Pick<SlotGridProps, 'studentTz' | 'onPick'> {
  day: GridDay;
}
