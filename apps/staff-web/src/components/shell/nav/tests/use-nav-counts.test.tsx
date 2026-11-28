import { studentListItemFixture, teacherRowFixture } from '@ab/shared/testing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useNavCounts } from '@/components/shell/nav/use-nav-counts';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@/features/messaging/inbox', () => ({
  useInboxLive: () => undefined,
  unreadCountQuery: () => ({ queryKey: ['threads', 'nav-count'], enabled: false }),
}));

const pages: Record<string, unknown> = {
  '/students?page=1&pageSize=1': {
    items: [studentListItemFixture()],
    total: 7,
    page: 1,
    pageSize: 1,
  },
  '/teachers?page=1&pageSize=1': { items: [teacherRowFixture()], total: 3, page: 1, pageSize: 1 },
};

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const render = (can: (p: string) => boolean, queries = client()) =>
  renderHook(() => useNavCounts(can), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queries}>{children}</QueryClientProvider>
    ),
  });

afterEach(() => mockApi.reset('read'));

it('counts the students and teachers from the total of their list routes', async () => {
  mockApi.onRead(async ({ path }) => pages[path] ?? { items: [], total: 0 });
  const { result } = render((p) => p === 'students.read' || p === 'teachers.read');
  await waitFor(() => expect(result.current.teachers).toEqual({ text: '3' }));
  expect(result.current.students).toEqual({ text: '7' });
});

it('shows no student count when the list answer breaks its route', async () => {
  mockApi.onRead(() => ({ items: [{ id: 's1' }], total: 7, page: 1, pageSize: 1 }));
  const queries = client();
  const { result } = render((p) => p === 'students.read', queries);
  await waitFor(() =>
    expect(
      queries.getQueryState(['students', 'nav-count', '/students?page=1&pageSize=1'])?.status,
    ).toBe('error'),
  );
  expect(result.current.students).toBeUndefined();
});

it('reads nothing the user may not read', () => {
  render(() => false);
  expect(mockApi.reads()).toHaveLength(0);
});
