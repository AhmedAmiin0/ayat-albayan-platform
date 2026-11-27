import type { RouteBody, RouteResult } from '@ab/core';
import type { portalLessonRoutes } from '@ab/shared';

type Routes = typeof portalLessonRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface FamilyLessonInput {
  studentId: string;
  lessonId: string;
}

export interface FamilySlotsInput extends FamilyLessonInput {
  from: string;
  to: string;
}

type CancelInput = FamilyLessonInput & NonNullable<RouteBody<Routes['cancel']>>;
type RequestInput = FamilyLessonInput & RouteBody<Routes['request']>;

export interface PortalLessonSends {
  confirm: (input: FamilyLessonInput) => Answer<'confirm'>;
  cancel: (input: CancelInput) => Answer<'cancel'>;
  request: (input: RequestInput) => Answer<'request'>;
  withdraw: (input: FamilyLessonInput) => Answer<'withdraw'>;
}
