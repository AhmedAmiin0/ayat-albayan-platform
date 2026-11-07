import type { SlotsResponse } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useBookingMode } from '@/features/teaching/booking/mode';
import { slotsQuery } from '@/features/teaching/schedule';

export interface RowSlotsInput {
  teacherId: string;
  durationMin: number;
  studentIds: readonly string[];
  excludeLessonId?: string | undefined;
  window: { from: Date; to: Date };
}

/** The slot grid's own data (GET /booking/slots) for the rows' week: free, busy and why. */
export function useRowSlots(input: RowSlotsInput): UseQueryResult<SlotsResponse> {
  const { window, ...rest } = input;
  return useQuery(slotsQuery({ ...rest, ...window }, useBookingMode()));
}
