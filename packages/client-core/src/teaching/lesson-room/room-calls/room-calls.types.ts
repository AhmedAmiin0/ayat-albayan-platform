import type { RouteResult } from '@ab/core';
import type { lessonRoomRoutes } from '@ab/schedule';

type Routes = typeof lessonRoomRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

/** A lesson's room and the student's link, for signed-in staff. */
export interface LessonRoomCalls {
  /** Admin or the lesson's teacher, before the usual window. */
  openRoom: (lessonId: string) => Answer<'open'>;
  /** Admin: creates or rotates the link; the old one stops working. */
  issueStudentLink: (studentId: string) => Answer<'issueStudentLink'>;
}

/** The student's own page with no login, on a public api client. */
export interface StudentLinkCalls {
  view: (token: string) => Answer<'studentLink'>;
}
