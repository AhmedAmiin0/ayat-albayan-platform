import type { Gender, Program } from '@ab/catalog';
import { useQuery } from '@tanstack/react-query';
import { pathKey } from '@ab/mobile-kit';
import { bookingCallsOf } from './booking-calls';
import { bookingPath, useBookingMode } from './booking-mode';

/** GET /booking/teachers (docs/10 route 12; sales prefix /sales): active teachers with load. */
export function useBookingTeachers(f: {
  program: Program;
  gender: Gender | null;
  enabled?: boolean;
}) {
  const params = { program: f.program, gender: f.gender ?? undefined };
  const mode = useBookingMode();
  return useQuery({
    queryKey: [...pathKey(bookingPath(mode, '/teachers')), params],
    queryFn: () => bookingCallsOf[mode].teachers(params),
    enabled: f.enabled ?? true,
  });
}

interface SlotsParams {
  teacherId: string;
  from: string;
  to: string;
  durationMin: number;
  /** These students' lessons of excludeCourse are not busy because they move. */
  studentIds?: string;
  excludeCourse?: string;
  /** A new trial date: the upcoming trial it moves is not busy. */
  excludeLessonId?: string;
}

/** GET /booking/slots (docs/10 route 13; sales prefix /sales): each start's clashes ([] = free). */
export function useSlots(params: SlotsParams) {
  const mode = useBookingMode();
  return useQuery({
    queryKey: [...pathKey(bookingPath(mode, '/slots')), params],
    queryFn: () => bookingCallsOf[mode].slots(params),
  });
}
