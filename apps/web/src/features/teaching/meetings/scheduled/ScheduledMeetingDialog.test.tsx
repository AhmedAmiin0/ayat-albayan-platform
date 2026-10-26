import type { MeetingCreateResult } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { meQuery, type Me } from '@/features/people/auth/me';
import { t } from '@/lib/i18n/i18n';
import { ScheduledMeetingDialog } from './ScheduledMeetingDialog';

const api = vi.hoisted(() => ({ fetch: vi.fn(), send: vi.fn() }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: api.fetch, apiSend: api.send }));

const L = t.meetingInvites;
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const URL = 'https://app.example.test/m/abc';
const TEXT = 'السلام عليكم… https://app.example.test/m/family';
const writeText = vi.fn();
const RESULT: MeetingCreateResult = {
  id: 'm-9',
  url: URL,
  replayed: false,
  invitees: [
    { id: 'i-1', kind: 'student', display_name: 'سهيلة', channel: 'whatsapp', status: 'window_closed', error_code: 'session_closed', sent_at: null, link: 'https://app.example.test/m/family', invitation_text: TEXT },
    { id: 'i-2', kind: 'phone', display_name: '+201000000101', channel: 'whatsapp', status: 'sent', error_code: null, sent_at: '2026-10-12T08:00:01.000Z', link: null, invitation_text: null },
  ],
};

function open(role: 'sales' | 'teacher' = 'sales') {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const me: Me = { id: 'u-1', email: null, role, permissions: [] };
  client.setQueryData(meQuery.queryKey, me);
  render(
    <QueryClientProvider client={client}>
      <ScheduledMeetingDialog onClose={onClose} tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );
  return onClose;
}

describe('ScheduledMeetingDialog «اجتماع مجدول»', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-12T08:00:00.000Z'));
    api.fetch.mockResolvedValue([{ kind: 'student', id: STUDENT_ID, name: 'سهيلة', code: 'AB-0101' }]);
    Object.assign(navigator, { clipboard: { writeText } });
    writeText.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    api.fetch.mockReset();
    api.send.mockReset();
  });

  it('posts the title, the UTC start of the Riyadh wall clock, the duration and the invitees', async () => {
    api.send.mockResolvedValue(RESULT);
    open();
    expect(screen.getByRole('dialog', { name: L.scheduleTitle })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(L.title), { target: { value: 'لقاء الأسر' } });
    fireEvent.change(screen.getByLabelText(L.date), { target: { value: '2026-10-14' } });
    fireEvent.change(screen.getByLabelText(L.time), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(L.duration), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('tab', { name: L.tabs.students }));
    fireEvent.click(await screen.findByRole('button', { name: /سهيلة/ }));
    fireEvent.click(screen.getByRole('tab', { name: L.tabs.phone }));
    fireEvent.change(screen.getByLabelText(L.tabs.phone), { target: { value: '+201000000101' } });
    fireEvent.click(screen.getByRole('button', { name: L.addPhone }));
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    await waitFor(() => expect(api.send).toHaveBeenCalled());
    expect(api.send).toHaveBeenCalledWith('POST', '/meetings', {
      title: 'لقاء الأسر',
      startsAt: '2026-10-14T15:00:00.000Z',
      durationMin: 45,
      invitees: [{ kind: 'student', studentId: STUDENT_ID }, { kind: 'phone', phone: '+201000000101' }],
      clientRequestId: expect.any(String),
    });
  });

  it('shows one result per recipient; «النافذة مغلقة» copies the invitation text with its link', async () => {
    api.send.mockResolvedValue(RESULT);
    open();
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    const results = await screen.findByRole('region', { name: L.results.title });
    expect((screen.getByLabelText(t.meetings.internal.link) as HTMLInputElement).value).toBe(URL);
    expect(within(results).getByText(L.results.windowClosed)).toBeTruthy();
    expect(within(results).getByText(L.results.windowClosedHint)).toBeTruthy();
    expect(within(results).getByText(L.results.sent)).toBeTruthy();
    expect(within(results).getAllByRole('button', { name: L.results.copy })).toHaveLength(1);
    fireEvent.click(within(results).getByRole('button', { name: L.results.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(TEXT));
    expect(await within(results).findByText(L.results.copied)).toBeTruthy();
  });

  it('a time in the past is refused before sending', async () => {
    open();
    fireEvent.change(screen.getByLabelText(L.date), { target: { value: '2026-10-11' } });
    fireEvent.click(screen.getByRole('button', { name: L.create }));
    expect(screen.getByText(L.errors.starts_in_past)).toBeTruthy();
    expect(api.send).not.toHaveBeenCalled();
  });

  it('«رقم هاتف» is offered to admin and sales only (a teacher picks from the team or their students)', () => {
    open('teacher');
    expect(screen.queryByRole('tab', { name: L.tabs.phone })).toBeNull();
    expect(screen.getByRole('tab', { name: L.tabs.students })).toBeTruthy();
  });

  it('a wrong phone is not added', () => {
    open();
    fireEvent.click(screen.getByRole('tab', { name: L.tabs.phone }));
    fireEvent.change(screen.getByLabelText(L.tabs.phone), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: L.addPhone }));
    expect(screen.getByLabelText(L.tabs.phone).getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByRole('list', { name: L.invitees })).toBeNull();
  });
});
