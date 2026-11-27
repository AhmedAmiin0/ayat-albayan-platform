import { mockCall } from '@ab/testing/mock-call';
import { call } from './api';

const mockApi = mockCall();
jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => mockApi.reset());

test('a jest test answers the kit call through mockCall and reads back what it saw', async () => {
  mockApi.answer('GET', '/auth/me', { role: 'admin' });
  await expect(call({ path: '/auth/me' })).resolves.toEqual({ role: 'admin' });
  await call({ method: 'POST', path: '/leads', body: { n: 1 } });
  expect(mockApi.writes()).toEqual([{ method: 'POST', path: '/leads', body: { n: 1 } }]);
});
