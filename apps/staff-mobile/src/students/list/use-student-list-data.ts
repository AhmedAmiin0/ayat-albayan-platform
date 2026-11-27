import { studentCalls, type ListParams } from '@ab/client-core';
import type { StudentListItem } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { studentKeys } from '@/core/lib/keys';
import { usePagedList } from '@/core/lib/query/use-paged-list';
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

/** GET /students page by page through its route, so each answer is parsed (R-STU-01, R-MOB-02). */
export const useStudentList = (params: ListParams, pageSize = 25) =>
  usePagedList<StudentListItem>({
    path: '/students',
    params,
    pageSize,
    read: (at, signal) => students.list({ ...params, ...at }, signal),
  });
