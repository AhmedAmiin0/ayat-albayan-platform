import { teacherStudentFileCalls } from '@ab/client-core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { lessonKeys } from '@/features/teaching/schedule';
import { apiFetch, apiSend } from '@ab/web-kit';

const studentFile = teacherStudentFileCalls({ apiFetch, apiSend });

/** Her own lessons only (docs/46 C5); null month is current; the last month stays while loading. */
export function useTeacherAttendance(studentId: string, month: string | null) {
  return useQuery({
    queryKey: lessonKeys.attendance(studentId, month),
    queryFn: () => studentFile.attendance({ studentId, month: month ?? undefined }),
    placeholderData: keepPreviousData,
  });
}
