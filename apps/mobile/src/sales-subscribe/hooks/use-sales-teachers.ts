import type { SalesTeacherOption } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';

/** GET /sales/subscriptions/teachers: «المعلم/ة»'s choices (the active teachers, names only). */
export function useSalesTeachers() {
  return useQuery({
    queryKey: ['sales', 'subscriptions', 'teachers'],
    queryFn: async () => {
      const rows = await apiFetch<SalesTeacherOption[]>('/sales/subscriptions/teachers');
      // An API without the route answers something else: no choices, the student's own teacher stays.
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 5 * 60_000,
  });
}
