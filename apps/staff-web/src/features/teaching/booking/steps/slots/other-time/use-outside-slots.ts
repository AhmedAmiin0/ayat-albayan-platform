import { useQuery } from '@tanstack/react-query';
import { lessonKeys } from '@/features/teaching/schedule';
import { bookingCallsOf, useBookingMode } from '@/features/teaching/booking/mode';
import type { OutsideParams } from './OtherTime';

/** The grid's fields only, never a time from this browser. */
export function outsideQuery(p: OutsideParams) {
  return {
    teacherId: p.teacherId,
    durationMin: p.durationMin,
    studentIds: p.studentIds.length > 0 ? p.studentIds.join(',') : undefined,
    excludeLessonId: p.excludeLessonId || undefined,
  };
}

/** The server's next 14 days, parsed with the shared schema. */
export function useOutsideSlots(p: OutsideParams) {
  const mode = useBookingMode();
  const query = outsideQuery(p);
  return useQuery({
    queryKey: lessonKeys.outsideSlots(mode, JSON.stringify(query)),
    queryFn: () => bookingCallsOf[mode].outsideSlots(query),
  });
}
