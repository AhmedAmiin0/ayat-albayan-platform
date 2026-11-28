import { studentRecordingsRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { StudentRecordingsApi } from './student-recordings-api.types';

/** A student's recordings for staff; the app keeps its own query keys and stale times. */
export function studentRecordingsApi(client: ApiClient): StudentRecordingsApi {
  const call = callWith(client);
  return {
    list: ({ studentId, query }) =>
      call({ route: studentRecordingsRoutes.list, params: { id: studentId }, query }),
    recordedLessonIds: (studentId) =>
      call({ route: studentRecordingsRoutes.recordedLessonIds, params: { id: studentId } }),
    setVisible: ({ id, visible }) =>
      call({ route: studentRecordingsRoutes.visibility, params: { id }, body: { visible } }),
    remove: (id) => call({ route: studentRecordingsRoutes.remove, params: { id } }),
  };
}
