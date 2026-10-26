import type { LessonRecordingView, MeetingView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InternalMeetingsList } from './InternalMeetingsList';
import { meetingRow } from '../meeting-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const R = t.classroom.recordings;
const row = (over: Partial<MeetingView> = {}): MeetingView =>
  meetingRow({ ends_at: '2026-10-05T10:00:00.000Z', state: 'ended', can_join: false, ...over });
const REC: LessonRecordingView[] = [{ id: 'r1', status: 'done', started_at: '2026-10-05T09:01:00Z', ended_at: '2026-10-05T09:59:00Z', url: 'https://files.test/r1.mp4' }];

function open(status: { configured: boolean }) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === '/meetings') return [row(), row({ id: 'm-2', title: 'لغيري', can_manage: false })];
    if (path === '/recordings/status') return status;
    return REC;
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <InternalMeetingsList />
    </QueryClientProvider>,
  );
}

describe('InternalMeetingsList «التسجيلات»', () => {
  it('the creator / admin opens a meeting’s recordings, even after it ended, and downloads them', async () => {
    open({ configured: true });
    const buttons = await screen.findAllByRole('button', { name: R.title });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    const panel = screen.getByRole('dialog', { name: R.title });
    expect((await within(panel).findByRole('link')).getAttribute('href')).toBe('https://files.test/r1.mp4');
    expect(apiFetch).toHaveBeenCalledWith('/meetings/m-1/recordings');
    expect(within(panel).queryByText(R.notConfigured)).toBeNull();
  });

  it('warns «التسجيل غير مفعّل على الخادم» when the server cannot record', async () => {
    open({ configured: false });
    fireEvent.click((await screen.findAllByRole('button', { name: R.title }))[0] as HTMLElement);
    expect(await screen.findByText(R.notConfigured)).toBeTruthy();
  });
});
