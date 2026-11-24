import type { Gender, Program } from '@ab/catalog';
import type { BookingTeacherOption, SlotsResponse } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString, pathKey } from '@ab/mobile-kit';
import { bookingPath, useBookingMode } from './booking-mode';

/** GET /booking/teachers?program&gender? (docs/10 route 12; sales: /sales/booking/teachers): active teachers by name, with load. */
export function useBookingTeachers(f: { program: Program; gender: Gender | null; enabled?: boolean }) {
  const params = { program: f.program, gender: f.gender ?? undefined };
  const path = bookingPath(useBookingMode(), '/teachers');
  return useQuery({
    queryKey: [...pathKey(path), params],
    queryFn: () => apiFetch<BookingTeacherOption[]>(`${path}${toQueryString(params)}`),
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

/** GET /booking/slots (docs/10 route 13; sales: /sales/booking/slots): candidate starts, each with its clashes ([] = free). */
export function useSlots(params: SlotsParams) {
  const path = bookingPath(useBookingMode(), '/slots');
  return useQuery({
    queryKey: [...pathKey(path), params],
    queryFn: () => apiFetch<SlotsResponse>(`${path}${toQueryString({ ...params })}`),
  });
}
