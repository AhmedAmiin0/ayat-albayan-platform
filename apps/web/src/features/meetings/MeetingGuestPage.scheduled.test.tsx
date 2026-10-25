import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeClient } from '@/features/classroom/room/livekit/fake-client';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { meetingJoinProblem } from './meeting-join-errors';
import { MeetingGuestPage } from './MeetingGuestPage';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const M = t.meetingInvites.list;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const VIEW = { title: 'لقاء الأسر', state: 'open', starts_at: '2026-10-13T12:00:00.000Z', opens_at: '2026-10-13T11:45:00.000Z' };

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MeetingGuestPage token="tok-9" make={() => fakeClient()} />
    </QueryClientProvider>,
  );
}

describe('MeetingGuestPage — a scheduled meeting', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-12T08:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    fetchMock.mockReset();
  });

  it('before the room opens: when it starts and when the room opens; an early join reads the opening day and time', async () => {
    fetchMock.mockResolvedValueOnce(json(200, VIEW));
    fetchMock.mockResolvedValueOnce(json(403, { code: 'join_not_open_yet', opens_at: VIEW.opens_at }));
    open();
    const intro = await screen.findByText(new RegExp(M.scheduledFor.replace('{when}', '')));
    expect(intro.textContent).toContain(M.opensAt.replace(' {when}', ''));
    fireEvent.change(screen.getByLabelText(new RegExp(t.classroom.guest.name)), { target: { value: 'ضيف' } });
    fireEvent.click(screen.getByRole('button', { name: t.classroom.guest.join }));
    const refusal = meetingJoinProblem(new ApiError(403, { code: 'join_not_open_yet', opens_at: VIEW.opens_at }));
    await waitFor(() => expect(screen.getByText(refusal)).toBeTruthy());
    expect(refusal).not.toContain('الحلقة');
  });

  it('once open, the plain intro', async () => {
    vi.setSystemTime(new Date('2026-10-13T11:50:00.000Z'));
    fetchMock.mockResolvedValueOnce(json(200, VIEW));
    open();
    expect(await screen.findByText(t.meetings.internal.guest.intro)).toBeTruthy();
  });
});
