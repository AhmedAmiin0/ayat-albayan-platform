import type { RouteQuery, RouteResult } from '@ab/core';
import type { feedbackRoutes } from '@ab/shared';

type Routes = typeof feedbackRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface FeedbackRequestRef {
  lessonId: string;
  studentId: string;
}

export interface FeedbackCalls {
  list: (query: RouteQuery<Routes['list']>) => Answer<'list'>;
  summary: () => Answer<'summary'>;
  mine: (query?: RouteQuery<Routes['mine']>) => Answer<'mine'>;
  request: (ref: FeedbackRequestRef) => Answer<'request'>;
}
