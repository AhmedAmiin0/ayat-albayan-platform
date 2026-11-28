import { renderHook, waitFor } from '@testing-library/react-native';
import { teacherFixture } from '@ab/shared/testing';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useAvailability, useTeacher } from '@/calendar/lib/queries';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const GRID = [{ id: 'a', weekday: 4, start_time: '16:00', end_time: '18:00', tz: 'Africa/Cairo' }];

beforeEach(() => mockApi.reset('read'));

const mount = async <T,>(read: () => T) =>
  (await renderHook(read, { wrapper: queryWrapper(createTestQueryClient()) })).result;

test('the teacher and the grid are read from their routes and kept as answered', async () => {
  const teacher = teacherFixture({ id: 't1' });
  mockApi.onRead(async ({ path }) => (path === '/teachers/t1' ? teacher : GRID));
  const result = await mount(() => [useTeacher('t1'), useAvailability('t1')] as const);
  await waitFor(() => expect(result.current[1].data).toEqual(GRID));
  expect(result.current[0].data).toEqual(teacher);
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/teachers/t1/availability' });
});

test('a teacher answer that does not fit the teacher view is an error', async () => {
  mockApi.onRead(() => ({ id: 't1' }));
  const result = await mount(() => useTeacher('t1'));
  await waitFor(() => expect(result.current.isError).toBe(true));
});

test('a grid answer that is not a list of slots is an error', async () => {
  mockApi.onRead(() => [{ id: 'a', weekday: 9 }]);
  const result = await mount(() => useAvailability('t1'));
  await waitFor(() => expect(result.current.isError).toBe(true));
});
