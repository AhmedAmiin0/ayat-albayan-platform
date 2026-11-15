import type { SalesTeacherOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

/** GET /sales/teachers/:id/overview — the teacher's «الجدول» and «الحضور» (read once a tab mounts it). */
export const useTeacherOverview = (id: string) =>
  useQuery({
    queryKey: pathKey(`/sales/teachers/${id}/overview`),
    queryFn: () => apiFetch<SalesTeacherOverview>(`/sales/teachers/${id}/overview`),
    enabled: id !== '',
  });
