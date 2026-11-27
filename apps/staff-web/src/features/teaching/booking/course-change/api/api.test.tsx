import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { changeCourse, courseChangeCheckQuery } from './api';
import type { CourseChangeBody } from './api.types';
import { CHECK, COURSE, MON } from '@/features/teaching/booking/course-change/change-fixture';
import { bookingKeys } from '@/features/teaching/booking/booking.keys';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

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
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(() => useQuery(courseChangeCheckQuery(body, 'sales')), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual(CHECK));
    unmount();
    await waitFor(() =>
      expect(client.getQueryCache().findAll({ queryKey: bookingKeys.mode('sales') })).toHaveLength(
        0,
      ),
    );
  });
});

const RESULT = {
  subscriptionId: COURSE.subscriptionId,
  ruleIds: ['9a1b2c3d-0000-4000-8000-000000000009'],
  endsOn: CHECK.endsOn,
};

const CHECKED = {
  subscriptionId: body.subscriptionId,
  byday: body.byday,
  startTimeLocal: body.startTimeLocal,
  startsOn: body.startsOn,
  startsAt: body.startsAt,
};

describe('the booking mode picks the route table', () => {
  afterEach(() => apiSend.mockReset());

  it.each([
    ['admin', '/booking/course/change'],
    ['sales', '/sales/booking/course/change'],
  ] as const)('%s checks without the idempotency key and saves on %s', async (mode, path) => {
    apiSend.mockResolvedValueOnce(CHECK).mockResolvedValueOnce(RESULT);
    const check = courseChangeCheckQuery(body, mode).queryFn;
    await expect(check?.({} as never)).resolves.toEqual(CHECK);
    expect(apiSend).toHaveBeenLastCalledWith('POST', `${path}/check`, CHECKED);
    await expect(changeCourse(body, mode)).resolves.toEqual(RESULT);
    expect(apiSend).toHaveBeenLastCalledWith('POST', path, body);
  });

  it('refuses a saved change the route does not describe', async () => {
    apiSend.mockResolvedValue({ ...RESULT, ruleIds: ['r-9'] });
    const failure = await changeCourse(body, 'admin').catch((e: unknown) => e);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
