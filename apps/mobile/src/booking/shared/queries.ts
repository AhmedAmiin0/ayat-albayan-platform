import type { BookingTeacherOption, Gender, Program, SlotsResponse } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
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
  /** «تغيير أيام الحلقات»: `?studentIds=a,b`, whose lessons of `excludeCourse` are not busy (they move). */
  studentIds?: string;
  excludeCourse?: string;
  /** «موعد تجريبي جديد»: the upcoming trial the new date moves is not busy. */
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
