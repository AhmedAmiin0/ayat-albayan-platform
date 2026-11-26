import type { RouteResult } from '@ab/core';
import type { testAccountRoutes } from '@ab/shared';

type Routes = typeof testAccountRoutes;

/** Which row the switch is on: a login or a student. */
export type TestFlagTarget = keyof Routes;

export interface TestFlagWrite {
  target: TestFlagTarget;
  id: string;
  isTest: boolean;
}

export type TestFlagCall = (write: TestFlagWrite) => Promise<RouteResult<Routes['user']>>;
