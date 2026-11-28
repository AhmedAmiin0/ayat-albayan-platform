import type { LessonRecordingView, MeetingView } from '@ab/schedule';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { InternalMeetingsList } from './InternalMeetingsList';
import { meetingRow } from '@/features/teaching/meetings/meeting-fixture';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const R = t.classroom.recordings;
const row = (over: Partial<MeetingView> = {}): MeetingView =>
  meetingRow({ ends_at: '2026-10-05T10:00:00.000Z', state: 'ended', can_join: false, ...over });
const REC: LessonRecordingView[] = [
  {
    id: 'r1',
    status: 'done',
    started_at: '2026-10-05T09:01:00Z',
    ended_at: '2026-10-05T09:59:00Z',
    url: 'https://files.test/r1.mp4',
  },
];

function open(status: { configured: boolean }) {
  mockApi.onRead(async ({ path }) => {
    if (path === '/meetings') return [row(), row({ id: 'm-2', title: 'لغيري', can_manage: false })];
    if (path === '/recordings/status') return status;
    return REC;
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
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
    expect((await within(panel).findByRole('link')).getAttribute('href')).toBe(
      'https://files.test/r1.mp4',
    );
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/meetings/m-1/recordings' });
    expect(within(panel).queryByText(R.notConfigured)).toBeNull();
  });

  it('warns «التسجيل غير مفعّل على الخادم» when the server cannot record', async () => {
    open({ configured: false });
    fireEvent.click((await screen.findAllByRole('button', { name: R.title }))[0] as HTMLElement);
    expect(await screen.findByText(R.notConfigured)).toBeTruthy();
  });
});
