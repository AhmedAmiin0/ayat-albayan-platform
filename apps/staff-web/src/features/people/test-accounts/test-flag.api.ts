import { ApiError, apiSend, t } from '@ab/web-kit';

export type TestFlagTarget = 'user' | 'student';

const PATH: Readonly<Record<TestFlagTarget, (id: string) => string>> = {
  user: (id) => `/admin/users/${id}/test`,
  student: (id) => `/students/${id}/test`,
};

export interface TestFlagWrite {
  target: TestFlagTarget;
  id: string;
  isTest: boolean;
}

/** PATCH …/test {is_test} (docs/56): the whole family flips on the server; the reads refresh. */
export function setTestFlag(write: TestFlagWrite): Promise<void> {
  return apiSend('PATCH', PATH[write.target](write.id), { is_test: write.isTest });
}

const MESSAGES: Readonly<Record<number, string>> = { 409: t.testAccounts.mismatch };

/** The alert under the switch: 409 = the family would mix test and real; else a retry hint. */
export function testFlagError(error: unknown): string {
  const status = error instanceof ApiError ? error.status : 0;
  return MESSAGES[status] ?? t.testAccounts.failed;
}
