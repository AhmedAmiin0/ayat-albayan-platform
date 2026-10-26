import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { meQuery, type Me } from '@/features/people/auth/me';
import { t } from '@/lib/i18n/i18n';
import { InternalMeetingsList } from './InternalMeetingsList';
import { meetingRow } from '../meeting-fixture';

const api = vi.hoisted(() => ({ fetch: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: api.fetch, apiSend: api.send }));

const M = t.meetingInvites.list;
const R = t.meetingInvites.results;
const writeText = vi.fn();
// Tomorrow 15:00 in Riyadh (12:00 UTC), 60 minutes.
const SCHEDULED = meetingRow({ starts_at: '2026-10-13T12:00:00.000Z', planned_end_at: '2026-10-13T13:00:00.000Z', can_join: false, invitees_count: 1 });
const INVITEE = { id: 'i-1', kind: 'phone', display_name: '+201000000101', channel: 'whatsapp', status: 'window_closed', error_code: 'session_closed', sent_at: null };
const ADMIN_ME: Me = { id: 'u-1', email: null, role: 'admin', permissions: [] };
const TEXT = 'ندعوكم… https://app.example.test/m/personal';

function open() {
  api.fetch.mockImplementation(async (path: string) => (path === '/meetings' ? [SCHEDULED] : [INVITEE]));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // An admin: «أعد الإرسال» on a phone row is for admin and sales only.
  client.setQueryData(meQuery.queryKey, ADMIN_ME);
  render(
    <QueryClientProvider client={client}>
      <InternalMeetingsList tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );
}

describe('InternalMeetingsList — the creator manages a scheduled meeting', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-12T08:00:00.000Z'));
    Object.assign(navigator, { clipboard: { writeText } });
    writeText.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    api.fetch.mockReset();
    api.send.mockReset();
  });

  it('«غيّر الموعد» patches the new time (viewer clock → UTC) and duration', async () => {
    api.send.mockResolvedValue(undefined);
    open();
    fireEvent.click(await screen.findByRole('button', { name: M.reschedule }));
    const dialog = screen.getByRole('dialog', { name: M.reschedule });
    expect((within(dialog).getByLabelText(t.meetingInvites.time) as HTMLSelectElement).value).toBe('15:00');
    fireEvent.change(within(dialog).getByLabelText(t.meetingInvites.time), { target: { value: '16:30' } });
    fireEvent.change(within(dialog).getByLabelText(t.meetingInvites.duration), { target: { value: '90' } });
    fireEvent.click(within(dialog).getByRole('button', { name: t.meetingInvites.save }));
    await waitFor(() =>
      expect(api.send).toHaveBeenCalledWith('PATCH', '/meetings/m-1', { startsAt: '2026-10-13T13:30:00.000Z', durationMin: 90 }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('«ألغِ الاجتماع» asks first, then posts cancel', async () => {
    api.send.mockResolvedValue(undefined);
    open();
    fireEvent.click(await screen.findByRole('button', { name: M.cancel }));
    const dialog = screen.getByRole('dialog', { name: M.cancel });
    expect(within(dialog).getByText(M.cancelConfirm)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: M.cancel }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('POST', '/meetings/m-1/cancel'));
  });

  it('«المدعوون» lists the statuses; «أعد الإرسال» shows the new link to copy with its text', async () => {
    api.send.mockResolvedValue({ ...INVITEE, link: 'https://app.example.test/m/personal', invitation_text: TEXT });
    open();
    fireEvent.click(await screen.findByRole('button', { name: M.invitees }));
    const dialog = screen.getByRole('dialog', { name: M.invitees });
    expect(await within(dialog).findByText(R.windowClosed)).toBeTruthy();
    expect(api.fetch).toHaveBeenCalledWith('/meetings/m-1/invitees');
    fireEvent.click(await within(dialog).findByRole('button', { name: `${R.resend} +201000000101` }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith('POST', '/meetings/m-1/invitees/i-1/resend', { clientRequestId: expect.any(String) }));
    fireEvent.click(await within(dialog).findByRole('button', { name: R.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(TEXT));
  });
});
