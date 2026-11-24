import type { BookingMode } from '@ab/client-core';
import type { QueryClient } from '@tanstack/react-query';
import { refreshAfterSalesWrite } from '@/features/sales/sales-money/api';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { CHECK_KEY } from './api';

/** The mounted series check is left alone: re-asked now it would answer no_change. */
export async function refreshAfterCourseChange(queryClient: QueryClient, mode: BookingMode): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: LESSONS_KEY }),
    queryClient.invalidateQueries({ queryKey: ['booking'], predicate: (q) => q.queryKey[2] !== CHECK_KEY }),
    ...(mode === 'sales' ? [refreshAfterSalesWrite(queryClient)] : []),
  ]);
}
