import { weekDates } from '@ab/time';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { byLocalDay } from '@ab/web-kit/schedule/slots';
import type { GridDay, SlotGridProps } from './SlotGrid.types';
import { dayLabel } from './slot-grid.helpers';

type Input = Pick<SlotGridProps, 'week' | 'slots' | 'value' | 'also'>;

export function useSlotGrid({ week, slots, value, also = [] }: Input) {
  const days = byLocalDay(slots, useViewerTz());
  const isPicked = (startsAt: string) => startsAt === value || also.includes(startsAt);
  const grid: GridDay[] = weekDates(week).map((day) => ({
    day,
    label: dayLabel(day),
    slots: (days.get(day) ?? []).map((slot) => ({ slot, picked: isPicked(slot.starts_at) })),
  }));
  return { grid };
}
