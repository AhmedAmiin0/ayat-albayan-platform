import { useQuery } from '@tanstack/react-query';
import { pathKey } from '@ab/mobile-kit';
import { bookingCallsOf } from '@/booking/shared/booking-calls';
import { bookingPath, useBookingMode } from '@/booking/shared/booking-mode';
import type { OutsideParams } from './OtherTime';

/** No time from the phone goes out; the answer is parsed with the shared schema. */
export function useOutsideSlots(params: OutsideParams) {
  const mode = useBookingMode();
  return useQuery({
    queryKey: [...pathKey(bookingPath(mode, '/outside-slots')), params],
    queryFn: () => bookingCallsOf[mode].outsideSlots(params),
  });
}
