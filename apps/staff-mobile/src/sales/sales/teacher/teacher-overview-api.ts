import type { SalesTeacherOverview } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

export const useTeacherOverview = (id: string) =>
  useQuery({
    queryKey: pathKey(`/sales/teachers/${id}/overview`),
    queryFn: () => apiFetch<SalesTeacherOverview>(`/sales/teachers/${id}/overview`),
    enabled: id !== '',
  });
