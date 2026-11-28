import type { RouteResult } from '@ab/core';
import type { testAccountRoutes } from '@ab/shared';

type Routes = typeof testAccountRoutes;

/** Which row the switch is on: a login or a student. */
export type TestFlagTarget = keyof Routes;

export interface TestFlagFlip {
  id: string;
  isTest: boolean;
}

export type TestFlagCall = (flip: TestFlagFlip) => Promise<RouteResult<Routes['user']>>;

export type TestFlagCalls = Readonly<Record<TestFlagTarget, TestFlagCall>>;
