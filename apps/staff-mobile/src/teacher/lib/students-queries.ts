import { myStudentsCall } from '@ab/client-core';
import type { TeacherStudentKind } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const myStudents = myStudentsCall({ apiFetch, apiSend });

/** GET /teachers/me/students?kind= (R-TCH-03): my subscribed or my trial students, never both. */
export function useMyStudents(kind: TeacherStudentKind) {
  const path = `/teachers/me/students?kind=${kind}`;
  return useQuery({ queryKey: pathKey(path), queryFn: () => myStudents(kind) });
}
