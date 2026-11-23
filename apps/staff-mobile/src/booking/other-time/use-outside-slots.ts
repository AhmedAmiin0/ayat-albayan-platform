import { outsideSlotsResponseSchema } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey, toQueryString } from '@ab/mobile-kit';
import { bookingPath, useBookingMode } from '@/booking/shared/booking-mode';
import type { OutsideParams } from './OtherTime';

/**
 * GET /booking/outside-slots (sales: /sales/booking/outside-slots), «وقت آخر»: the server's next
 * 14 days. No time from the phone goes out; the answer is parsed with the shared schema.
 */
export function useOutsideSlots(params: OutsideParams) {
  const path = bookingPath(useBookingMode(), '/outside-slots');
  return useQuery({
    queryKey: [...pathKey(path), params],
    queryFn: async () =>
      outsideSlotsResponseSchema.parse(await apiFetch(`${path}${toQueryString({ ...params })}`)),
  });
}
