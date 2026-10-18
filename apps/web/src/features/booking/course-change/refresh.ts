import type { QueryClient } from '@tanstack/react-query';
import { refreshAfterSalesWrite } from '@/features/inbox/sales-money/api';
import { LESSONS_KEY } from '@/features/schedule/api';
import type { BookingMode } from '../mode';

/** After «تغيير أيام الحلقات»: the calendar and slot grids, the change reads, and her sales reads. */
export async function refreshAfterCourseChange(queryClient: QueryClient, mode: BookingMode): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: LESSONS_KEY }),
    queryClient.invalidateQueries({ queryKey: ['booking'] }),
    ...(mode === 'sales' ? [refreshAfterSalesWrite(queryClient)] : []),
  ]);
}
