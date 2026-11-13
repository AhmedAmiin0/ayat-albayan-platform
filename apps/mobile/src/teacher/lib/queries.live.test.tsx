import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useMyLessons, usePendingReports } from './queries';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

// docs/48 MOBILE POLL: 30 s only while the screen is in front (live), never otherwise.
const WINDOW = { from: '2026-10-01T00:00:00Z', to: '2026-10-02T00:00:00Z' };
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
