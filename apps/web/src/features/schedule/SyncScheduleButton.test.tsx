import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SyncScheduleButton } from './SyncScheduleButton';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ apiSend, apiFetch: vi.fn(), ApiError: Error }));

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

afterEach(() => apiSend.mockReset());

describe('«مزامنة الجدول» (R-SCH-02)', () => {
  it('posts the refresh, reloads the calendar and says how many lessons were added', async () => {
    apiSend.mockResolvedValue({ rules: 3, inserted: 5, failed: 0, ended: 0 });
    const { onDone, invalidate } = open();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.sync }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.schedule.synced.replace('{n}', '5')));
    expect(apiSend).toHaveBeenCalledWith('POST', '/schedule-rules/refresh');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['lessons'] });
  });

  it('nothing missing → says the schedule is already in sync', async () => {
    apiSend.mockResolvedValue({ rules: 3, inserted: 0, failed: 0, ended: 0 });
    const { onDone } = open();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.sync }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.schedule.syncedNone));
  });

  it('a failure is the generic error', async () => {
    apiSend.mockRejectedValue(new Error('offline'));
    const { onDone } = open();
    fireEvent.click(screen.getByRole('button', { name: t.schedule.sync }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.common.error));
  });
});
