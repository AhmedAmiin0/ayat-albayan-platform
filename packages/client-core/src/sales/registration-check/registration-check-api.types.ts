import type { RouteQuery, RouteResult } from '@ab/core';
import type { registrationCheckRoutes } from '@ab/shared';

type Check = (typeof registrationCheckRoutes)['check'];

export interface RegistrationCheckCalls {
  check: (query: RouteQuery<Check>) => Promise<RouteResult<Check>>;
}
