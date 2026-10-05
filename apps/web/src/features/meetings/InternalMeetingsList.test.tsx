import type { MeetingView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { InternalMeetingsList } from './InternalMeetingsList';

const api = vi.hoisted(() => ({ fetch: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: api.fetch, apiSend: api.send }));

const L = t.meetings.internal;
const row = (over: Partial<MeetingView> = {}): MeetingView => ({
  id: 'm-1',
  title: 'اجتماع الإدارة',
  created_by: 'u-1',
  created_at: '2026-10-05T09:00:00.000Z',
  ends_at: null,
  state: 'open',
  can_manage: true,
  ...over,
});

function open(rows: MeetingView[]) {
  api.fetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InternalMeetingsList />
    </QueryClientProvider>,
  );
}

describe('InternalMeetingsList «الاجتماعات الداخلية»', () => {
  afterEach(() => {
    cleanup();
    api.fetch.mockReset();
    api.send.mockReset();
  });

  it('lists the meetings with enter, a new link and end for the ones I manage', async () => {
    open([row(), row({ id: 'm-2', title: 'قديم', state: 'ended' }), row({ id: 'm-3', title: 'لغيري', can_manage: false })]);
    await waitFor(() => expect(screen.getByText('اجتماع الإدارة')).toBeTruthy());
    expect(api.fetch).toHaveBeenCalledWith('/meetings');
    expect(screen.getAllByRole('link', { name: L.enter }).map((a) => a.getAttribute('href'))).toEqual(['/meeting/m-1', '/meeting/m-3']);
    expect(screen.getAllByRole('button', { name: L.end })).toHaveLength(1);
    expect(screen.getByText(L.ended)).toBeTruthy();
  });

  it('«رابط جديد» shows the fresh link; «إنهاء الاجتماع» posts end', async () => {
    api.send.mockResolvedValueOnce({ id: 'm-1', url: 'https://app.example.test/m/new' });
    open([row()]);
    fireEvent.click(await screen.findByRole('button', { name: L.newLink }));
    await waitFor(() => expect((screen.getByLabelText(L.link) as HTMLInputElement).value).toBe('https://app.example.test/m/new'));
    expect(api.send).toHaveBeenCalledWith('POST', '/meetings/m-1/link');
    api.send.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: L.end }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('POST', '/meetings/m-1/end'));
  });

  it('says so when there are none', async () => {
    open([]);
    await waitFor(() => expect(screen.getByText(L.empty)).toBeTruthy());
  });
});
