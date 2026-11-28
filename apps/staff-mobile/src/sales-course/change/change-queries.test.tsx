import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useChangeCourse, useCourseChangeCheck } from './change-queries';
import type { ChangeBody } from './change-calls.types';
import { SUB_ID } from '@/sales-course/testing/fixtures';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const body: ChangeBody = {
  subscriptionId: SUB_ID,
  byday: [1, 3],
  startTimeLocal: '18:00',
  startsOn: '2026-10-05',
  startsAt: '2026-10-05T15:00:00.000Z',
  clientRequestId: '00000000-0000-4000-8000-000000000001',
};
const check = { conflicts: [], remaining: 5, endsOn: '2026-10-21' };

test('the check is dropped once unmounted, so the same picks after a save ask the server again', async () => {
  mockApiSend.mockResolvedValue(check);
  const client = createTestQueryClient();
  const { result, unmount } = await renderHook(() => useCourseChangeCheck(body), {
    wrapper: queryWrapper(client),
  });
  await waitFor(() => expect(result.current.data).toEqual(check));
  await unmount();
  await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['sales', 'booking', 'course-change'] })).toHaveLength(0));
});

afterEach(() => mockApiSend.mockReset());

test('the assistant checks on her own route without the idempotency key in the cache key', async () => {
  mockApiSend.mockResolvedValue(check);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useCourseChangeCheck(body), {
    wrapper: queryWrapper(client),
  });
  await waitFor(() => expect(result.current.data).toEqual(check));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/booking/course/change/check', body);
  const [query] = client.getQueryCache().findAll({ queryKey: ['sales', 'booking', 'course-change'] });
  expect(JSON.stringify(query?.queryKey)).not.toContain(body.clientRequestId);
});

test('no check is asked before a day is picked', async () => {
  const { result } = await renderHook(() => useCourseChangeCheck(null), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  expect(result.current.fetchStatus).toBe('idle');
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a saved change the route does not describe fails instead of showing a broken result', async () => {
  mockApiSend.mockResolvedValue({ subscriptionId: SUB_ID, ruleIds: ['r1'], endsOn: null });
  const { result } = await renderHook(() => useChangeCourse(), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  await act(async () => {
    await result.current.mutateAsync(body).catch(() => undefined);
  });
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/booking/course/change', body);
  expect(result.current.error).toMatchObject({ body: { code: 'bad_response' } });
});
