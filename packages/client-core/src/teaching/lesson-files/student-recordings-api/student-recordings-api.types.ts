import type { RouteQuery, RouteResult } from '@ab/core';
import type { studentRecordingsRoutes } from '@ab/schedule';

type Routes = typeof studentRecordingsRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface StudentRecordingsPageInput {
  studentId: string;
  query: RouteQuery<Routes['list']>;
}

export interface StudentRecordingsApi {
  list: (input: StudentRecordingsPageInput) => Answer<'list'>;
  recordedLessonIds: (studentId: string) => Answer<'recordedLessonIds'>;
  setVisible: (input: { id: string; visible: boolean }) => Answer<'visibility'>;
  remove: (id: string) => Answer<'remove'>;
}
