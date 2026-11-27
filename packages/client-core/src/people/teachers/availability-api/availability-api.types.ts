import type { availabilityRoutes } from '@ab/shared';
import type { RouteBody, RouteResult } from '@ab/core';

type Routes = typeof availabilityRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

/** `id` is the teacher's id; `timeOffId` one of the teacher's time-off rows. */
export interface AvailabilityCalls {
  grid: (id: string) => Answer<'grid'>;
  replaceGrid: (id: string, body: RouteBody<Routes['replaceGrid']>) => Answer<'replaceGrid'>;
  timeOff: (id: string) => Answer<'timeOff'>;
  addTimeOff: (id: string, body: RouteBody<Routes['addTimeOff']>) => Answer<'addTimeOff'>;
  removeTimeOff: (ids: { id: string; timeOffId: string }) => Answer<'removeTimeOff'>;
}
