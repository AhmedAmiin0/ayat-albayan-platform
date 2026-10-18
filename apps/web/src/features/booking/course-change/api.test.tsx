import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { courseChangeCheckQuery, type CourseChangeBody } from './api';
import { CHECK, COURSE, MON } from './change-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const body: CourseChangeBody = {
  subscriptionId: COURSE.subscriptionId,
  byday: [1, 3],
  startTimeLocal: '18:00',
  startsOn: '2026-10-05',
  startsAt: MON,
  clientRequestId: '00000000-0000-4000-8000-000000000001',
};

describe('courseChangeCheckQuery', () => {
  afterEach(() => apiSend.mockReset());

  it('drops the check once unmounted, so the same picks after a save ask the server again', async () => {
    apiSend.mockResolvedValue(CHECK);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => useQuery(courseChangeCheckQuery(body, 'sales')), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(CHECK));
    unmount();
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['booking', 'sales'] })).toHaveLength(0));
  });
});
