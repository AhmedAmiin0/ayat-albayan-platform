import type { SalesTeacherOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

/** GET /sales/teachers/:id/overview — the teacher's «الجدول» and «الحضور» (read only when a tab shows it). */
export const useTeacherOverview = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: pathKey(`/sales/teachers/${id}/overview`),
    queryFn: () => apiFetch<SalesTeacherOverview>(`/sales/teachers/${id}/overview`),
    enabled: enabled && id !== '',
  });
