import { mockCall } from '@ab/testing/mock-call';
import { beforeEach, expect, it, vi } from 'vitest';
import { call } from '@ab/web-kit/lib/http/api';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => mockApi.reset());

it('a vitest test answers the kit call through mockCall and reads back what it saw', async () => {
  mockApi.onRead(({ path }) => ({ path }));
  await expect(call({ path: '/students?page=2' })).resolves.toEqual({ path: '/students?page=2' });
  expect(mockApi.reads()).toEqual([{ method: 'GET', path: '/students?page=2' }]);
});
