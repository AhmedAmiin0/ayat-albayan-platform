import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeClient } from '@/features/classroom/fake-client';
import { t } from '@/lib/i18n/i18n';
import { MeetingGuestPage } from './MeetingGuestPage';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const L = t.meetings.internal.guest;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const TOKEN = 'tok-43';

function open() {
  const client = fakeClient();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MeetingGuestPage token={TOKEN} make={() => client} />
    </QueryClientProvider>,
  );
  return client;
}

describe('MeetingGuestPage /m/:token', () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
  });

  it('shows the title, then joins as a guest with the typed name', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { title: 'اجتماع الإدارة', state: 'open' }));
    fetchMock.mockResolvedValueOnce(json(200, { url: 'wss://lk', token: 'g', room: 'meeting-1', role: 'guest' }));
    const client = open();
    await waitFor(() => expect(screen.getByText('اجتماع الإدارة')).toBeTruthy());
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/public\/meetings\/tok-43$/);
    fireEvent.change(screen.getByLabelText(new RegExp(t.classroom.guest.name)), { target: { value: 'ضيف' } });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    await waitFor(() => expect(client.connect).toHaveBeenCalledWith('wss://lk', 'g'));
    const [url, init] = fetchMock.mock.calls[1] ?? [];
    expect(String(url)).toMatch(/\/public\/meetings\/tok-43\/join$/);
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ name: 'ضيف' });
  });

  it('an ended meeting says so, with no form', async () => {
    fetchMock.mockResolvedValue(json(200, { title: 'x', state: 'ended' }));
    open();
    await waitFor(() => expect(screen.getByText(L.ended)).toBeTruthy());
    expect(screen.queryByRole('button', { name: t.classroom.guest.join })).toBeNull();
  });

  it('an unknown link says it is invalid; a join refused 410 shows meeting_ended', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { code: 'link_invalid' }));
    open();
    await waitFor(() => expect(screen.getByText(L.invalid)).toBeTruthy());
    cleanup();
    fetchMock.mockResolvedValueOnce(json(200, { title: 'x', state: 'open' }));
    fetchMock.mockResolvedValueOnce(json(410, { code: 'meeting_ended' }));
    open();
    await waitFor(() => expect(screen.getByRole('button', { name: t.classroom.guest.join })).toBeTruthy());
    fireEvent.change(screen.getByLabelText(new RegExp(t.classroom.guest.name)), { target: { value: 'ضيف' } });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    await waitFor(() => expect(screen.getByText(t.classroom.error.meeting_ended)).toBeTruthy());
  });
});
