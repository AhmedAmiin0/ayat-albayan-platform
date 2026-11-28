import type { RouteBody, RouteQuery, RouteResult } from '@ab/core';
import type { courseTeacherRoutes, courseTimesRoutes } from '@ab/shared';

type Times = typeof courseTimesRoutes;
type Teacher = typeof courseTeacherRoutes;
type Answer<R extends Times[keyof Times] | Teacher[keyof Teacher]> = Promise<RouteResult<R>>;

export interface CourseTimesCalls {
  view: (studentId: string, query: RouteQuery<Times['view']>) => Answer<Times['view']>;
  check: (studentId: string, body: RouteBody<Times['check']>) => Answer<Times['check']>;
  change: (studentId: string, body: RouteBody<Times['change']>) => Answer<Times['change']>;
}

export interface CourseTeacherCalls {
  view: (studentId: string, query: RouteQuery<Teacher['view']>) => Answer<Teacher['view']>;
  check: (studentId: string, body: RouteBody<Teacher['check']>) => Answer<Teacher['check']>;
  change: (studentId: string, body: RouteBody<Teacher['change']>) => Answer<Teacher['change']>;
  teachers: (studentId: string) => Answer<Teacher['teachers']>;
}
