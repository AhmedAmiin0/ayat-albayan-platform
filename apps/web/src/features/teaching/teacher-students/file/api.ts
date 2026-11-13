import { teacherLessonPaths, teacherStudentHeadSchema } from '@ab/client-core';
import type { TeacherStudentHead } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { apiFetch } from '@/lib/http/api';

const readHead = async (url: string): Promise<TeacherStudentHead> =>
  teacherStudentHeadSchema.parse(await apiFetch(url));

/**
 * GET /teachers/me/students/:id (docs/47): the file's head (name, status, course, next 14 days).
 * Under LESSONS_KEY, so a report submit or a cancel re-reads the counts and the upcoming rows.
 */
export const teacherStudentHeadQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...LESSONS_KEY, 'teacher-student', studentId],
    queryFn: () => readHead(teacherLessonPaths.student(studentId)),
  });
