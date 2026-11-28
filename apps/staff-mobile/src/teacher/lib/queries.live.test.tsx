import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useMyAvailability, useMyLessons, usePendingReports } from './queries';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

// docs/48 MOBILE POLL: 30 s only while the screen is in front (live), never otherwise.
const WINDOW = { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' };
const GRID = [{ id: 'a', weekday: 4, start_time: '16:00', end_time: '18:00', tz: 'Africa/Cairo' }];
const calls = (prefix: string) =>
  mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockApiFetch.mockResolvedValue([]);
});
afterEach(() => jest.useRealTimers());

async function mount(live: boolean) {
  const wrapper = queryWrapper(createTestQueryClient());
  await renderHook(() => [useMyLessons(WINDOW, live), usePendingReports(live)], { wrapper });
  await waitFor(() => expect(calls('/teachers/me/pending-reports')).toBe(1));
}

const mountGrid = async (id: string | undefined) =>
  (await renderHook(() => useMyAvailability(id), {
    wrapper: queryWrapper(createTestQueryClient()),
  })).result;

test.each([
  [true, 2],
  [false, 1],
])('live=%s: lessons and pending reports read %s times after 30 s', async (live, n) => {
  await mount(live);
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  expect(calls('/teachers/me/lessons')).toBe(n);
  expect(calls('/teachers/me/pending-reports')).toBe(n);
});

test('my grid is read from the availability route once my id is known', async () => {
  mockApiFetch.mockResolvedValue(GRID);
  const result = await mountGrid('t1');
  await waitFor(() => expect(result.current.data).toEqual(GRID));
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/t1/availability');
});

test('without my id the grid is not read', async () => {
  const result = await mountGrid(undefined);
  expect(result.current.fetchStatus).toBe('idle');
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('a grid answer that is not a list of slots is an error', async () => {
  mockApiFetch.mockResolvedValue({ rows: GRID });
  const result = await mountGrid('t1');
  await waitFor(() => expect(result.current.isError).toBe(true));
});
