import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { fakeClient } from '@ab/web-kit/testing';
import { GuestJoinPage } from './GuestJoinPage';

// A known student from the signed link is never asked to type a name; the API uses theirs.
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
    expect(screen.getByText(t.classroom.guest.introKnown)).toBeTruthy();
    expect(screen.queryByText(t.classroom.guest.intro)).toBeNull();
    expect(screen.getByText(t.classroom.recordedNotice)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    await waitFor(() => expect(client.connect).toHaveBeenCalledWith('wss://lk', 'g'));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({});
  });

  it('an anonymous link still asks the name first', () => {
    open(false);
    expect(screen.getByLabelText(new RegExp(t.classroom.guest.name))).toBeTruthy();
    expect(screen.getByText(t.classroom.guest.intro)).toBeTruthy();
  });
});
