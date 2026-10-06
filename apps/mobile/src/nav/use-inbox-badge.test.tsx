import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useInboxBadge } from './use-inbox-badge';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const THREADS = '/threads?unread=true&page=1&pageSize=1';
const LEADS = '/leads?status=new&page=1&pageSize=1';

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (path: string) => ({ total: path === THREADS ? 3 : 2 }));
});

const wrapper = (): (({ children }: { children: ReactNode }) => ReactNode) => queryWrapper(createTestQueryClient());

test('sums unread threads and new leads from the count endpoints (pageSize=1)', async () => {
  const { result } = await renderHook(() => useInboxBadge(() => true), { wrapper: wrapper() });
  await waitFor(() => expect(result.current).toBe('5'));
  expect(mockApiFetch).toHaveBeenCalledWith(THREADS);
  expect(mockApiFetch).toHaveBeenCalledWith(LEADS);
});

test('skips a count the role cannot read (no 403)', async () => {
  const { result } = await renderHook(() => useInboxBadge((p) => p === 'leads.read'), { wrapper: wrapper() });
  await waitFor(() => expect(result.current).toBe('2'));
  expect(mockApiFetch).not.toHaveBeenCalledWith(THREADS);
});

test('reads nothing and shows no badge when neither is allowed', async () => {
  const { result } = await renderHook(() => useInboxBadge(() => false), { wrapper: wrapper() });
  expect(result.current).toBeUndefined();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('zero counts: no badge', async () => {
  mockApiFetch.mockResolvedValue({ total: 0 });
  const { result } = await renderHook(() => useInboxBadge(() => true), { wrapper: wrapper() });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  expect(result.current).toBeUndefined();
});
