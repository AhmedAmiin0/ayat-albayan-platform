import type { RouteQuery, RouteResult } from '@ab/core';
import type { assistantsRoutes } from '@ab/schedule';

type Routes = typeof assistantsRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface AssistantPick {
  studentId: string;
  profileId: string;
}

export interface AssistantsApi {
  all: () => Answer<'all'>;
  mine: (day: RouteQuery<Routes['mine']>) => Answer<'mine'>;
  forStudent: (studentId: string) => Answer<'forStudent'>;
  assign: (input: AssistantPick) => Answer<'assign'>;
  remove: (input: AssistantPick) => Answer<'remove'>;
}
