import type { RouteResult } from '@ab/core';
import type { salesTeacherOverviewRoutes } from '@ab/shared';

type Overview = (typeof salesTeacherOverviewRoutes)['overview'];

export interface TeacherOverviewCalls {
  overview: (id: string) => Promise<RouteResult<Overview>>;
}
