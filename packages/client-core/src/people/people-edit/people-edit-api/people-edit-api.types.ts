import type { peopleEditRoutes } from '@ab/shared';
import type { RouteBody, RouteResult } from '@ab/core';

type Routes = typeof peopleEditRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;
type Body<K extends keyof Routes> = RouteBody<Routes[K]>;

/** `id` is the student's or the guardian's id, as the route's path names it. */
export interface PeopleEditCalls {
  view: (id: string) => Answer<'view'>;
  editStudent: (id: string, body: Body<'editStudent'>) => Answer<'editStudent'>;
  editGuardian: (id: string, body: Body<'editGuardian'>) => Answer<'editGuardian'>;
  removePhone: (params: { id: string; phone: string }) => Answer<'removePhone'>;
  families: (search: string) => Answer<'families'>;
  move: (id: string, body: Body<'move'>) => Answer<'move'>;
  contactSelf: (id: string, body: Body<'contactSelf'>) => Answer<'contactSelf'>;
  toStudent: (id: string) => Answer<'toStudent'>;
  toGuardian: (id: string) => Answer<'toGuardian'>;
}
