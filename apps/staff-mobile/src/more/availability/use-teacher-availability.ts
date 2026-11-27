import { availabilityCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const availability = availabilityCalls({ apiFetch, apiSend });

/** GET /teachers/:id/availability: the weekly grid (R-TCH-02). */
export const useWeeklyGrid = (teacherId: string) =>
  useQuery({
    queryKey: pathKey(`/teachers/${teacherId}/availability`),
    queryFn: () => availability.grid(teacherId),
  });

/** GET /teachers/:id/time-off: every time off of the teacher (R-TCH-02). */
export const useTimeOff = (teacherId: string) =>
  useQuery({
    queryKey: pathKey(`/teachers/${teacherId}/time-off`),
    queryFn: () => availability.timeOff(teacherId),
  });
