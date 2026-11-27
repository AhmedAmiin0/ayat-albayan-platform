import type { RouteBody, RouteResult } from '@ab/core';
import type { feedbackPublicRoutes } from '@ab/shared';

type Routes = typeof feedbackPublicRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface PublicFeedbackCalls {
  form: (token: string) => Answer<'form'>;
  submit: (token: string, body: RouteBody<Routes['submit']>) => Answer<'submit'>;
}
