import type { MeetingView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InternalMeetingsList } from './InternalMeetingsList';
import { meetingRow as row } from './meeting-fixture';

const api = vi.hoisted(() => ({ fetch: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: api.fetch, apiSend: api.send }));

const L = t.meetings.internal;
const M = t.meetingInvites.list;
const TZ = 'Asia/Riyadh';

function open(rows: MeetingView[]) {
  api.fetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InternalMeetingsList tz={TZ} />
    </QueryClientProvider>,
  );
}

describe('InternalMeetingsList «الاجتماعات الداخلية»', () => {
  afterEach(() => {
    cleanup();
    api.fetch.mockReset();
    api.send.mockReset();
  });

  it('lists the meetings with enter (when can_join), a new link and end for the instant ones I manage', async () => {
    open([row(), row({ id: 'm-2', title: 'قديم', state: 'ended', can_join: false }), row({ id: 'm-3', title: 'لغيري', can_manage: false })]);
    await waitFor(() => expect(screen.getByText('اجتماع الإدارة')).toBeTruthy());
    expect(api.fetch).toHaveBeenCalledWith('/meetings');
    expect(screen.getAllByRole('link', { name: M.enter }).map((a) => a.getAttribute('href'))).toEqual(['/meeting/m-1', '/meeting/m-3']);
    expect(screen.getAllByRole('button', { name: L.end })).toHaveLength(1);
    expect(screen.getByText(L.ended)).toBeTruthy();
    expect(screen.getAllByText(M.instant)).toHaveLength(3);
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

  it('a scheduled meeting shows its time on the viewer clock, the invitees, «يُفتح الدخول» and no enter before the window', async () => {
    const early = row({
      starts_at: '2026-10-13T12:00:00.000Z',
      planned_end_at: '2026-10-13T13:00:00.000Z',
      window: { state: 'early', opens_at: '2026-10-13T11:45:00.000Z', closes_at: '2026-10-13T15:00:00.000Z' },
      can_join: false,
      invitees_count: 3,
    });
    open([early]);
    expect(await screen.findByText(new RegExp(`^${M.scheduledFor.replace('{when}', '.*15:00')}$`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`^${M.opensAt.replace('{when}', '.*14:45')}$`))).toBeTruthy();
    expect(screen.getByText(M.inviteesCount.replace('{n}', '3'))).toBeTruthy();
    expect(screen.queryByRole('link', { name: M.enter })).toBeNull();
    expect(screen.getByRole('button', { name: M.reschedule })).toBeTruthy();
    expect(screen.queryByRole('button', { name: L.end })).toBeNull();
  });

  it('a cancelled one says «ملغى» with no enter; an invitation to me says «أنت مدعو» without the creator actions', async () => {
    open([
      row({ id: 'm-1', starts_at: '2026-10-13T12:00:00.000Z', cancelled_at: '2026-10-12T08:00:00.000Z', state: 'ended', can_join: false }),
      row({ id: 'm-2', title: 'دعوة', can_manage: false, my_invite: { status: 'sent', channel: 'in_app' } }),
    ]);
    await waitFor(() => expect(screen.getByText(M.cancelled)).toBeTruthy());
    expect(screen.getByText(M.invitedYou)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: M.enter }).map((a) => a.getAttribute('href'))).toEqual(['/meeting/m-2']);
    expect(screen.queryByRole('button', { name: M.cancel })).toBeNull();
    expect(screen.getAllByRole('button', { name: M.invitees })).toHaveLength(1);
  });

  it('says so when there are none', async () => {
    open([]);
    await waitFor(() => expect(screen.getByText(L.empty)).toBeTruthy());
  });
});
