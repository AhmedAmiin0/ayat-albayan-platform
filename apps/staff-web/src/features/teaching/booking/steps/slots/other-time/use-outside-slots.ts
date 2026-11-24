import { outsideSlotsResponseSchema } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit/lib/http/api';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { bookingBase, useBookingMode } from '@/features/teaching/booking/mode';
import type { OutsideParams } from './OtherTime.types';

/** The query string: the grid's fields only, never a time from this browser. */
export function outsideQuery(p: OutsideParams): string {
  const params = new URLSearchParams({
    teacherId: p.teacherId,
    durationMin: String(p.durationMin),
  });
  if (p.studentIds.length > 0) params.set('studentIds', p.studentIds.join(','));
  if (p.excludeLessonId) params.set('excludeLessonId', p.excludeLessonId);
  return params.toString();
}

/** The server's next 14 days, parsed with the shared schema. */
export function useOutsideSlots(p: OutsideParams) {
  const mode = useBookingMode();
  const query = outsideQuery(p);
  return useQuery({
    queryKey: [...LESSONS_KEY, 'outside-slots', mode, query],
    queryFn: async () =>
      outsideSlotsResponseSchema.parse(
        await apiFetch(`${bookingBase(mode)}/outside-slots?${query}`),
      ),
  });
}
