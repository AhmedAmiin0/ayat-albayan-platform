import type { RouteResult } from '@ab/core';
import type { myPayoutRoutes } from '@ab/shared';

export interface MyPayoutCalls {
  list: () => Promise<RouteResult<(typeof myPayoutRoutes)['mine']>>;
}
