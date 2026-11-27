import { studentRecordingsRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { StudentRecordingsApi } from './student-recordings-api.types';

/** A student's recordings for staff; the app keeps its own query keys and stale times. */
export function studentRecordingsApi(client: ApiClient): StudentRecordingsApi {
  const call = callWith(client);
  return {
    list: ({ studentId, query }) => call({ route: routes.list, params: { id: studentId }, query }),
    recordedLessonIds: (studentId) =>
      call({ route: routes.recordedLessonIds, params: { id: studentId } }),
    setVisible: ({ id, visible }) =>
      call({ route: routes.visibility, params: { id }, body: { visible } }),
    remove: (id) => call({ route: routes.remove, params: { id } }),
  };
}
