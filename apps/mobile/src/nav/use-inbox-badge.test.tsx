import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useInboxBadge } from './use-inbox-badge';

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
