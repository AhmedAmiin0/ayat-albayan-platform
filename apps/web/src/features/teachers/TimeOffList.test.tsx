import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { formatTimeOff } from './time-off';
import { TimeOffList } from './TimeOffList';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const OFF = { id: 'o1', starts_at: '2026-10-10T06:00:00Z', ends_at: '2026-10-12T18:00:00Z', reason: 'سفر' };

function renderList(rows: unknown[] = [OFF]) {
  apiFetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TimeOffList teacherId="t1" />
    </QueryClientProvider>,
  );
}

describe('TimeOffList (R-TCH-02, docs/07 §8)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('shows each span with its reason and the device-zone hint', async () => {
    renderList();
    expect(await screen.findByText(formatTimeOff(OFF.starts_at, OFF.ends_at))).toBeTruthy();
    expect(screen.getByText(`${t.availability.reason}: سفر`)).toBeTruthy();
    expect(screen.getByText(t.availability.timeOffTzHint)).toBeTruthy();
  });

  it('says so when there is no time-off', async () => {
    renderList([]);
    expect(await screen.findByText(t.availability.timeOffEmpty)).toBeTruthy();
  });

  it('deletes one entry by its named icon button', async () => {
    apiSend.mockResolvedValue(null);
    renderList();
    const span = formatTimeOff(OFF.starts_at, OFF.ends_at);
    fireEvent.click(await screen.findByRole('button', { name: `${t.availability.timeOffDelete} ${span}` }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/teachers/t1/time-off/o1'));
  });

  it('adds through the dialog: validates, posts UTC instants, then closes', async () => {
    apiSend.mockResolvedValue({});
    renderList([]);
    fireEvent.click(await screen.findByRole('button', { name: t.availability.timeOffAdd }));
    const dialog = screen.getByRole('dialog', { name: t.availability.timeOffAdd });
    const submit = () => fireEvent.click(screen.getAllByRole('button', { name: t.availability.timeOffAdd }).at(-1) as HTMLElement);
    submit();
    expect(screen.getByRole('alert').textContent).toBe(t.common.required);
    fireEvent.change(screen.getByLabelText(t.availability.startsAt), { target: { value: '2026-10-05T10:00' } });
    fireEvent.change(screen.getByLabelText(t.availability.endsAt), { target: { value: '2026-10-07T18:00' } });
    submit();
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/teachers/t1/time-off', {
        starts_at: new Date(2026, 9, 5, 10, 0).toISOString(),
        ends_at: new Date(2026, 9, 7, 18, 0).toISOString(),
        reason: null,
      }),
    );
    await waitFor(() => expect(dialog.isConnected).toBe(false));
  });
});
