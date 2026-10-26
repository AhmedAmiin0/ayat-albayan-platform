import type { QueryClient } from '@tanstack/react-query';
import { refreshAfterSalesWrite } from '@/features/messaging/inbox/sales-money/api';
import { LESSONS_KEY } from '@/features/teaching/schedule/api';
import type { BookingMode } from '../mode';
import { CHECK_KEY } from './api';

/**
 * After «تغيير أيام الحلقات»: the calendar and slot grids, the change reads, and her sales reads. The
 * still-mounted series check is left alone: re-asked now it would answer no_change before «تم».
 */
export async function refreshAfterCourseChange(queryClient: QueryClient, mode: BookingMode): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: LESSONS_KEY }),
    queryClient.invalidateQueries({ queryKey: ['booking'], predicate: (q) => q.queryKey[2] !== CHECK_KEY }),
    ...(mode === 'sales' ? [refreshAfterSalesWrite(queryClient)] : []),
  ]);
}
