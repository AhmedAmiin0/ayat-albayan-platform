import type { StudentStatus } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import { countParams, type StudentFilters } from './student-filters';

export type StatusCounts = Record<StudentStatus, number>;
export type TeacherOption = { id: string; display_name_ar: string; display_name_en?: string | null };

/** GET /students/status-counts: students per status under the other filters, for the pill counts. */
export const useStatusCounts = (filters: StudentFilters) =>
  useQuery({
    queryKey: ['students', 'status-counts', countParams(filters)],
    queryFn: () => apiFetch<StatusCounts>(`/students/status-counts${toQueryString(countParams(filters))}`),
  });

/** GET /students/teacher-options: the active teachers to filter by (loaded when the panel opens). */
export const useTeacherOptions = (enabled: boolean) =>
  useQuery({
    queryKey: ['students', 'teacher-options'],
    queryFn: () => apiFetch<TeacherOption[]>('/students/teacher-options'),
    enabled,
    staleTime: 10 * 60_000,
  });
