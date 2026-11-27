import type { RouteBody, RouteParams, RouteResult } from '@ab/core';
import type { lessonRatingRoutes } from '@ab/shared';

type Send = (typeof lessonRatingRoutes)['send'];

export interface LessonRatingCalls {
  send: (chat: RouteParams<Send>, body: RouteBody<Send>) => Promise<RouteResult<Send>>;
}
