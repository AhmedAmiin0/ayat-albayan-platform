import type { BookingTeacherOption, Gender, Program, SlotsResponse } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

/** GET /booking/teachers?program&gender? (docs/10 route 12): active teachers by name, with load. */
export function useBookingTeachers(f: { program: Program; gender: Gender | null }) {
  const params = { program: f.program, gender: f.gender ?? undefined };
  return useQuery({
    queryKey: [...pathKey('/booking/teachers'), params],
    queryFn: () => apiFetch<BookingTeacherOption[]>(`/booking/teachers${toQueryString(params)}`),
  });
}

export interface SlotsParams {
  teacherId: string;
  from: string;
  to: string;
  durationMin: number;
}

/** GET /booking/slots (docs/10 route 13): candidate starts, each with its clashes ([] = free). */
export function useSlots(params: SlotsParams) {
  return useQuery({
    queryKey: [...pathKey('/booking/slots'), params],
    queryFn: () => apiFetch<SlotsResponse>(`/booking/slots${toQueryString({ ...params })}`),
  });
}
