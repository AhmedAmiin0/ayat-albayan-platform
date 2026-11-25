import { useState } from 'react';
import { useViewerTz } from '@ab/web-kit';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import { daysOf, outsideParams, shownDay } from './other-time-options';
import { useOutsideSlots } from './use-outside-slots';

/** The server's list for this draft by the viewer's day, and the day on show (first by default). */
export function useOtherTime(draft: BookingDraft) {
  const viewer = useViewerTz();
  const read = useOutsideSlots(outsideParams(draft));
  const days = daysOf(read.data?.slots ?? [], viewer);
  const [day, setDay] = useState<string | null>(null);
  const shown = shownDay(days, day);
  return { viewer, read, days, shown, slots: days.get(shown ?? '') ?? [], setDay };
}
