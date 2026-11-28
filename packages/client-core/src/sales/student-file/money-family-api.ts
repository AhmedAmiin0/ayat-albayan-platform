import { salesMoneyFamilyRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesMoneyFamilyCalls } from './money-family-api.types';

/** Her students of a chat's family with their packages owed, on one api client. */
export function salesMoneyFamilyCalls(client: ApiClient): SalesMoneyFamilyCalls {
  const call = callWith(client);
  return {
    family: (query) => call({ route: salesMoneyFamilyRoutes.family, query }),
  };
}
