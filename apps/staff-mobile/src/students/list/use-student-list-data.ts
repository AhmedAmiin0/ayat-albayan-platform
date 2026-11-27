import { studentCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { studentKeys } from '@/core/lib/keys';
import { countParams, type StudentFilters } from './student-filters';

const students = studentCalls({ apiFetch, apiSend });

/** GET /students/status-counts: students per status under the other filters, for the pill counts. */
export const useStatusCounts = (filters: StudentFilters) =>
  useQuery({
    queryKey: studentKeys.statusCounts(countParams(filters)),
    queryFn: () => students.statusCounts(countParams(filters)),
  });

/** GET /students/teacher-options: the active teachers to filter by (loaded when the panel opens). */
export const useTeacherOptions = (enabled: boolean) =>
  useQuery({
    queryKey: studentKeys.teacherOptions(),
    queryFn: () => students.teacherOptions(),
    enabled,
    staleTime: 10 * 60_000,
  });
