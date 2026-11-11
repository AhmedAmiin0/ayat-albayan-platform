import { teacherLessonPaths } from '@ab/client-core';
import type { StudentAttendanceTable } from '@ab/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiFetch } from '@/lib/http/api';

const readLog = (url: string): Promise<StudentAttendanceTable> => apiFetch(url);

/**
 * «سجل الحضور» of one of her students (docs/46 C5): GET /teachers/me/students/:id/attendance,
 * her own lessons only, months on her calendar. `month` null: the current one. The last month
 * stays on screen while the next loads; a cancel or confirm re-reads it (under LESSONS_KEY).
 */
export function useTeacherAttendance(studentId: string, month: string | null) {
  const path = teacherLessonPaths.attendance(studentId);
  const url = month ? `${path}?month=${month}` : path;
  return useQuery({
    queryKey: [...LESSONS_KEY, 'attendance', studentId, month ?? 'current'],
    queryFn: () => readLog(url),
    placeholderData: keepPreviousData,
  });
}
