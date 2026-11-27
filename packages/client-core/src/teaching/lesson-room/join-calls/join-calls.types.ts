import type { RouteResult } from '@ab/core';
import type { lessonJoinRoutes } from '@ab/schedule';

type Routes = typeof lessonJoinRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface JoinLinkSend {
  lessonId: string;
  studentId: string;
}

/** A lesson's room for its signed-in staff, and the family's one-lesson link. */
export interface LessonJoinCalls {
  /** Admin, the lesson's teacher or an assigned assistant: a fresh identity per call. */
  join: (lessonId: string) => Answer<'join'>;
  /** Admin: the family's link, by WhatsApp. */
  sendLink: (send: JoinLinkSend) => Answer<'sendLink'>;
  /** Admin or the lesson's teacher: the guest url to copy, nothing is sent. */
  linkUrl: (lessonId: string) => Answer<'linkUrl'>;
  /** A family link opened while signed in: the lesson whose staff room to enter. */
  staffLessonOf: (token: string) => Answer<'staffLessonOf'>;
}
