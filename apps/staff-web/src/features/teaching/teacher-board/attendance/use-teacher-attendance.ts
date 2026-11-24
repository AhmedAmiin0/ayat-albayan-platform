import { attendanceTableSchema, teacherLessonPaths } from '@ab/client-core';
import type { StudentAttendanceTable } from '@ab/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiFetch } from '@ab/web-kit/lib/http/api';

const readLog = async (url: string): Promise<StudentAttendanceTable> =>
  attendanceTableSchema.parse(await apiFetch(url));

/** Her own lessons only (docs/46 C5); null month is current; the last month stays while loading. */
export function useTeacherAttendance(studentId: string, month: string | null) {
  const path = teacherLessonPaths.attendance(studentId);
  const url = month ? `${path}?month=${month}` : path;
  return useQuery({
    queryKey: [...LESSONS_KEY, 'attendance', studentId, month ?? 'current'],
    queryFn: () => readLog(url),
    placeholderData: keepPreviousData,
  });
}
