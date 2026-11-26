import { testAccountRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { TestFlagCall } from './test-flag-api.types';

/** PATCH …/test {is_test} (docs/56) on one api client: the whole family flips on the server. */
export function testFlagCall(client: ApiClient): TestFlagCall {
  const call = callWith(client);
  return ({ target, id, isTest }) =>
    call({ route: routes[target], params: { id }, body: { is_test: isTest } });
}
