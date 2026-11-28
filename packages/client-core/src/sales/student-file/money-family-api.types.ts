import type { RouteResult } from '@ab/core';
import type { salesMoneyFamilyRoutes } from '@ab/shared';

export interface SalesMoneyFamilyCalls {
  family: (query: { phone: string }) => Promise<RouteResult<typeof salesMoneyFamilyRoutes.family>>;
}
