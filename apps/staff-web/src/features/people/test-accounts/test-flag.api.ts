import { testFlagCall } from '@ab/client-core';
import { ApiError, apiFetch, apiSend, t } from '@ab/web-kit';

/** The whole family flips on the server; the reads refresh. */
export const setTestFlag = testFlagCall({ apiFetch, apiSend });

const MESSAGES: Readonly<Record<number, string>> = { 409: t.testAccounts.mismatch };

/** The alert under the switch: 409 = the family would mix test and real; else a retry hint. */
export function testFlagError(error: unknown): string {
  const status = error instanceof ApiError ? error.status : 0;
  return MESSAGES[status] ?? t.testAccounts.failed;
}
