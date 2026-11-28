import { studentProfileFixture } from '@ab/shared/testing';
import { pathKey } from '@ab/mobile-kit';
import { createTestQueryClient } from '@/test/query';
import { studentProfileQuery } from '@/students/profile-query';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => mockApi.reset('read'));

test('reads GET /students/:id through its route', async () => {
  const profile = studentProfileFixture({ id: 's1', name: 'سارة' });
  mockApi.onRead(() => profile);
  const read = await createTestQueryClient().query(studentProfileQuery('s1'));
  expect(read).toEqual(profile);
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/students/s1' });
});

test('caches under the path key the student writes already refresh', () => {
  expect(studentProfileQuery('s1').queryKey).toEqual(pathKey('/students/s1'));
});

test('a profile that breaks the route answer is refused', async () => {
  mockApi.onRead(() => ({ id: 's1', name: 'سارة' }));
  const read = createTestQueryClient().query(studentProfileQuery('s1'));
  await expect(read).rejects.toThrow();
});
