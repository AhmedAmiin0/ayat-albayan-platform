import type { SalesTeacherOption } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@ab/mobile-kit';
import { salesKeys } from '@/core/lib/keys';

/** Active teachers, names only. */
export function useSalesTeachers() {
  return useQuery({
    queryKey: salesKeys.teachers(),
    queryFn: async () => {
      const rows = await apiFetch<SalesTeacherOption[]>('/sales/subscriptions/teachers');
      // An API without the route answers something else: no choices, the student's own teacher stays.
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 5 * 60_000,
  });
}
