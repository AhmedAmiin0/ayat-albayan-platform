import { testAccountRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { TestFlagCalls } from './test-flag-api.types';

/** PATCH …/test {is_test} (docs/56) on one api client: the whole family flips on the server. */
export function testFlagCalls(client: ApiClient): TestFlagCalls {
  const call = callWith(client);
  return {
    user: ({ id, isTest }) =>
      call({ route: testAccountRoutes.user, params: { id }, body: { is_test: isTest } }),
    student: ({ id, isTest }) =>
      call({ route: testAccountRoutes.student, params: { id }, body: { is_test: isTest } }),
  };
}
