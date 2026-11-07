import { INBOX_FALLBACK_MS, INBOX_LIST_REFRESH_MS } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { inboxLive } from '@/inbox/thread/live';
import { badgePollMs, useInboxBadge } from './use-inbox-badge';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const THREADS = '/threads?unread=true&page=1&pageSize=1';

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (path: string) => ({ total: path === THREADS ? 3 : 2 }));
});

const wrapper = (): (({ children }: { children: ReactNode }) => ReactNode) => queryWrapper(createTestQueryClient());

test('shows the unread threads only: a new lead is already one of them (no double count)', async () => {
  const { result } = await renderHook(() => useInboxBadge(() => true), { wrapper: wrapper() });
  await waitFor(() => expect(result.current).toBe('3'));
  expect(mockApiFetch).toHaveBeenCalledWith(THREADS);
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
});

test('a leads-only role has no badge and requests no count (no 403)', async () => {
  const { result } = await renderHook(() => useInboxBadge((p) => p === 'leads.read'), { wrapper: wrapper() });
  expect(result.current).toBeUndefined();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('reads nothing and shows no badge when inbox.read is not allowed', async () => {
  const { result } = await renderHook(() => useInboxBadge(() => false), { wrapper: wrapper() });
  expect(result.current).toBeUndefined();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('zero counts: no badge', async () => {
  mockApiFetch.mockResolvedValue({ total: 0 });
  const { result } = await renderHook(() => useInboxBadge(() => true), { wrapper: wrapper() });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
  expect(result.current).toBeUndefined();
});

test('polls at the chats list’s pace while realtime is down, its fallback net while live (docs/44 BUG4)', () => {
  expect(badgePollMs(false)).toBe(INBOX_LIST_REFRESH_MS);
  expect(badgePollMs(true)).toBe(INBOX_FALLBACK_MS);
});

test('a quietly dead socket: the badge still re-reads on its interval', async () => {
  jest.useFakeTimers();
  try {
    const { result } = await renderHook(() => useInboxBadge(() => true), { wrapper: wrapper() });
    await waitFor(() => expect(result.current).toBe('3'));
    mockApiFetch.mockResolvedValue({ total: 5 });
    await act(() => jest.advanceTimersByTimeAsync(INBOX_LIST_REFRESH_MS));
    await waitFor(() => expect(result.current).toBe('5'));
    await act(async () => inboxLive.setLive(true));
    const calls = mockApiFetch.mock.calls.length;
    await act(() => jest.advanceTimersByTimeAsync(INBOX_FALLBACK_MS));
    await waitFor(() => expect(mockApiFetch.mock.calls.length).toBeGreaterThan(calls));
  } finally {
    await act(async () => inboxLive.setLive(false));
    jest.useRealTimers();
  }
});
