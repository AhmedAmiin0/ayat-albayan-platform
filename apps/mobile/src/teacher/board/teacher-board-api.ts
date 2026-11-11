import { teacherLessonPaths } from '@ab/client-core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { attendanceTableSchema } from './attendance-table-schema';

/**
 * GET /teachers/me/students/:id/attendance?month= (docs/46 C5): her own lessons with one of her
 * students, one month (null: the current one in her zone); the last month stays while the next
 * loads.
 */
export function useTeacherAttendance(studentId: string, month: string | null) {
  const path = teacherLessonPaths.attendance(studentId);
  const url = month ? `${path}?month=${month}` : path;
  return useQuery({
    queryKey: [...pathKey(path), month ?? 'current'],
    queryFn: async () => attendanceTableSchema.parse(await apiFetch(url)),
    enabled: studentId !== '',
    placeholderData: keepPreviousData,
  });
}
