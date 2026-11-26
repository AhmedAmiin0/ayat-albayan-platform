import { teacherStudentRoutes, type TeacherStudentKind, type TeacherStudentView } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';

/** GET /teachers/me/students?kind= on one api client; the answer is parsed strictly. */
export function myStudentsCall(
  client: ApiClient,
): (kind: TeacherStudentKind) => Promise<TeacherStudentView[]> {
  const call = callWith(client);
  return (kind) => call({ route: teacherStudentRoutes.mine, query: { kind } });
}
