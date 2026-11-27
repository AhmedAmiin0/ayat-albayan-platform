import { teacherOverviewCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const teacherOverview = teacherOverviewCalls({ apiFetch, apiSend });

export const useTeacherOverview = (id: string) =>
  useQuery({
    queryKey: pathKey(`/sales/teachers/${id}/overview`),
    queryFn: () => teacherOverview.overview(id),
    enabled: id !== '',
  });
