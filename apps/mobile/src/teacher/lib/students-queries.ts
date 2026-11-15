import type { TeacherStudentKind, TeacherStudentView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

/** GET /teachers/me/students?kind= (R-TCH-03): my subscribed or my trial students, never both. */
export function useMyStudents(kind: TeacherStudentKind) {
  const path = `/teachers/me/students?kind=${kind}`;
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<TeacherStudentView[]>(path) });
}
