import type { RouteBody, RouteResult } from '@ab/core';
import type { coursePauseRoutes } from '@ab/shared';

type Routes = typeof coursePauseRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface CoursePauseWindow {
  studentId: string;
  from: string;
  /** null means until resumed. */
  until: string | null;
}

export interface CoursePauseCalls {
  state: (studentId: string) => Answer<'state'>;
  preview: (window: CoursePauseWindow) => Answer<'preview'>;
  resumePreview: (studentId: string) => Answer<'resumePreview'>;
  start: (studentId: string, body: RouteBody<Routes['start']>) => Answer<'start'>;
  until: (studentId: string, untilDate: string | null) => Answer<'until'>;
  /** A package row's resume names its package; the banner's names none. */
  resume: (studentId: string, subscriptionId?: string) => Answer<'resume'>;
}
