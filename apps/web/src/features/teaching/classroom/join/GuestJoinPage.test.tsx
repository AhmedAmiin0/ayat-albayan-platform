import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { fakeClient } from '@/features/teaching/classroom/room/livekit/fake-client';
import { GuestJoinPage } from './GuestJoinPage';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const reply = (status: number, body: unknown) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

function open() {
  const client = fakeClient();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GuestJoinPage linkToken="tok-1" make={() => client} />
    </QueryClientProvider>,
  );
  return client;
}
const submit = (name: string) => {
  fireEvent.change(screen.getByLabelText(new RegExp(t.classroom.guest.name)), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
};

describe('GuestJoinPage', () => {
  afterEach(() => fetchMock.mockReset());

  it('needs a name before it calls the API', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    expect(screen.getByText(t.common.required)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(t.classroom.recordedNotice)).toBeTruthy();
  });

  it('posts the trimmed name to the link and opens the room', async () => {
    reply(200, { url: 'wss://lk', token: 'g', room: 'lesson-1', role: 'guest' });
    const client = open();
    submit('  سهيلة ');
    await waitFor(() => expect(client.connect).toHaveBeenCalledWith('wss://lk', 'g'));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/public/join/tok-1');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'سهيلة' });
  });

  it.each([
    [404, 'link_invalid'],
    [410, 'link_expired'],
    [410, 'join_closed'],
    [429, 'too_many_requests'],
  ] as const)('%s %s reads its own line', async (status, code) => {
    reply(status, { code, message: code });
    open();
    submit('سهيلة');
    expect(await screen.findByText(t.classroom.error[code])).toBeTruthy();
  });

  it('before the window opens it says when: «تُفتح الساعة …»', async () => {
    reply(403, { code: 'join_not_open_yet', opens_at: '2026-10-03T15:45:00.000Z' });
    open();
    submit('سهيلة');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(t.classroom.opensAt.split('{')[0] as string);
    expect(alert.textContent).toMatch(/\d{2}:\d{2}/);
  });
});
