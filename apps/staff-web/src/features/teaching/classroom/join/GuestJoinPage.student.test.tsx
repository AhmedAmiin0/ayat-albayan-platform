import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { fakeClient } from '@/features/teaching/classroom/room/livekit/fake-client';
import { GuestJoinPage } from './GuestJoinPage';

// The family app's signed /join link names the (lesson, student): a known student is never asked
// to type a name (the API takes the student's), only «ادخل» and the recording notice.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function open(knownStudent: boolean) {
  const client = fakeClient();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GuestJoinPage linkToken="tok-1" knownStudent={knownStudent} make={() => client} />
    </QueryClientProvider>,
  );
  return client;
}

describe('GuestJoinPage for a link that names its student', () => {
  afterEach(() => fetchMock.mockReset());

  it('has no name field and joins with an empty body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: 'wss://lk', token: 'g', room: 'lesson-1', role: 'guest' }), { status: 200 }),
    );
    const client = open(true);
    expect(screen.queryByLabelText(new RegExp(t.classroom.guest.name))).toBeNull();
    expect(screen.getByText(t.classroom.recordedNotice)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    await waitFor(() => expect(client.connect).toHaveBeenCalledWith('wss://lk', 'g'));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it('an anonymous link still asks the name first', () => {
    open(false);
    expect(screen.getByLabelText(new RegExp(t.classroom.guest.name))).toBeTruthy();
  });
});
