import type { LessonView } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { useTeacherCancel, useTeacherConfirm } from './teacher-lesson-api';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));

// docs/48 MOBILE MUTATIONS: «سأحضر» optimistic with rollback; cancel write-through.
const TODAY = ['lessons', 'mine', { from: 'a', to: 'b' }];
const WEEK = ['lessons', 'mine', { from: 'c', to: 'd' }];
const OTHER = ['lessons', 'day', { date: 'x' }];
const ahead = lesson({ id: 'l1', status: 'confirmed' });

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(TODAY, [ahead]);
  client.setQueryData(WEEK, [ahead]);
  client.setQueryData(OTHER, [ahead]);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  return { client, invalidate, wrapper: queryWrapper(client) };
}
const rowOf = (client: ReturnType<typeof setup>['client'], key: unknown[]) =>
  client.getQueryData<LessonView[]>(key)?.[0];
const keysOf = (invalidate: ReturnType<typeof setup>['invalidate']) =>
  invalidate.mock.calls.map(([f]) => f?.queryKey);

beforeEach(() => jest.clearAllMocks());

test('«سأحضر» patches her rows before the answer', async () => {
  let answer: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useTeacherConfirm('l1'), { wrapper });
  await act(async () => result.current.mutate());
  await waitFor(() => expect(rowOf(client, TODAY)?.teacher_confirmed_at).toBeTruthy());
  expect(rowOf(client, WEEK)?.teacher_confirmed_at).toBeTruthy();
  await act(async () => answer({ ...ahead, teacher_confirmed_at: '2026-10-01T12:00:00Z' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

test('a refused «سأحضر» rolls the rows back', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started' }));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useTeacherConfirm('l1'), { wrapper });
  await act(async () => result.current.mutate());
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(rowOf(client, TODAY)?.teacher_confirmed_at ?? null).toBeNull();
  expect(rowOf(client, WEEK)?.teacher_confirmed_at ?? null).toBeNull();
});

test('a landed cancel closes the row and re-reads lessons and /teachers/me', async () => {
  mockApiSend.mockResolvedValue({ ...ahead, status: 'cancelled_by_teacher', cancel_reason: 'سفر' });
  const { client, invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useTeacherCancel('l1'), { wrapper });
  await act(async () => result.current.mutate({ reason: 'سفر' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(rowOf(client, TODAY)?.status).toBe('cancelled_by_teacher');
  expect(rowOf(client, WEEK)?.status).toBe('cancelled_by_teacher');
  expect(rowOf(client, OTHER)?.status).toBe('confirmed');
  expect(keysOf(invalidate)).toEqual(expect.arrayContaining([['lessons'], ['teachers', 'me']]));
});

test('a refused cancel never flashes a closed row', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_started' }));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useTeacherCancel('l1'), { wrapper });
  await act(async () => result.current.mutate({ reason: 'سفر' }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(rowOf(client, TODAY)?.status).toBe('confirmed');
});
