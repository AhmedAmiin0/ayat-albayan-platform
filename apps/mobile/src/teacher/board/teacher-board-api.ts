import {
  attendanceTableSchema,
  teacherLessonPaths,
  teacherStudentHeadSchema,
} from '@ab/client-core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

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

/**
 * GET /teachers/me/students/:id (docs/47 PR 1): the student file's head (name, status, course
 * dates and counts, her next 14 days with the student). Under /teachers/me/students, so a report
 * submit (refreshAfterSubmit) refreshes it with the log.
 */
export function useTeacherStudentHead(studentId: string) {
  const path = teacherLessonPaths.student(studentId);
  return useQuery({
    queryKey: pathKey(path),
    queryFn: async () => teacherStudentHeadSchema.parse(await apiFetch(path)),
    enabled: studentId !== '',
  });
}
