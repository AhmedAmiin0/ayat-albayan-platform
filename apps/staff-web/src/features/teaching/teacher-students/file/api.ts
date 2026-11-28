import { teacherStudentFileCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { lessonKeys } from '@/features/teaching/schedule';
import { apiFetch, apiSend } from '@ab/web-kit';

const studentFile = teacherStudentFileCalls({ apiFetch, apiSend });

/**
 * GET /teachers/me/students/:id (docs/47): the file's head (name, status, course, next 14 days).
 * Under lessonKeys.all, so a report submit or a cancel re-reads the counts and the upcoming rows.
 */
export const teacherStudentHeadQuery = (studentId: string) =>
  queryOptions({
    queryKey: lessonKeys.teacherStudent(studentId),
    queryFn: () => studentFile.head(studentId),
  });
