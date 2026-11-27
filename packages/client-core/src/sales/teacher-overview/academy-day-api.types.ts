import type { RouteQuery, RouteResult } from '@ab/core';
import type { salesAcademyDayRoutes } from '@ab/shared';

type Routes = typeof salesAcademyDayRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export type SalesAcademyDayQuery = RouteQuery<Routes['day']>;

export interface SalesAcademyDayCalls {
  day: (query: SalesAcademyDayQuery) => Answer<'day'>;
  live: () => Answer<'live'>;
}
