import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { SyncScheduleButton } from './SyncScheduleButton';
import { lessonKeys } from './lesson.keys';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', () => ({
  ApiError: Error,
  call: (request: unknown) => mockApi.call(request),
}));

function open() {
  const onDone = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <SyncScheduleButton onDone={onDone} />
    </QueryClientProvider>,
  );
  return { onDone, invalidate };
}

afterEach(() => mockApi.reset('write'));

describe('«مزامنة الجدول» (R-SCH-02)', () => {
  it('posts the refresh, reloads the calendar and says how many lessons were added', async () => {
    mockApi.onWrite(() => ({ rules: 3, inserted: 5, failed: 0, ended: 0 }));
    const { onDone, invalidate } = open();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.sync }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.schedule.synced.replace('{n}', '5')));
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/schedule-rules/refresh',
      body: undefined,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: lessonKeys.all });
  });

  it('nothing missing → says the schedule is already in sync', async () => {
    mockApi.onWrite(() => ({ rules: 3, inserted: 0, failed: 0, ended: 0 }));
    const { onDone } = open();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.sync }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.schedule.syncedNone));
  });

  it('a failure is the generic error', async () => {
    mockApi.onWrite(() => Promise.reject(new Error('offline')));
    const { onDone } = open();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.sync }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.common.error));
  });
});
