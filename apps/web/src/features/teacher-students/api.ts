import type { TeacherStudentKind, TeacherStudentView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/** GET /teachers/me/students?kind= — my subscribed or my trial students, one list per kind. */
export const teacherStudentsQuery = (kind: TeacherStudentKind) =>
  queryOptions({
    queryKey: ['teachers', 'me', 'students', kind],
    queryFn: () => apiFetch<TeacherStudentView[]>(`/teachers/me/students?kind=${kind}`),
  });
