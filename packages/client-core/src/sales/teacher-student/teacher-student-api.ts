import { teacherStudentFileRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { TeacherStudentFileCalls } from './teacher-student-api.types';

/** A teacher's own student file (head and attendance log), on one api client. */
export function teacherStudentFileCalls(client: ApiClient): TeacherStudentFileCalls {
  const call = callWith(client);
  return {
    head: (id) => call({ route: teacherStudentFileRoutes.head, params: { id } }),
    attendance: ({ studentId, month }) =>
      call({
        route: teacherStudentFileRoutes.attendance,
        params: { id: studentId },
        query: { month },
      }),
  };
}
