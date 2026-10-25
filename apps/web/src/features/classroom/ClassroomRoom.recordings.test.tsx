import type { LessonRecordingView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { joinAs } from './board/board-fixture';
import { ClassroomRoom } from './ClassroomRoom';
import { fakeClient, tile } from './fake-client';

const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: api.fetch }));

const REC: LessonRecordingView[] = [
  { id: 'r1', status: 'done', started_at: '2026-10-03T15:00:00Z', ended_at: '2026-10-03T15:40:00Z', url: 'https://files.test/r1.mp4' },
  { id: 'r2', status: 'recording', started_at: '2026-10-03T16:00:00Z', ended_at: null, url: null },
];

function open(role: 'teacher' | 'admin' | 'assistant' | 'guest') {
  const c = fakeClient({ tiles: [tile({ key: 'me', isLocal: true, role })] });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ClassroomRoom join={joinAs(role)} make={() => c} />
    </QueryClientProvider>,
  );
  return c;
}

describe('ClassroomRoom recordings', () => {
  beforeEach(() => {
    api.fetch.mockReset();
  });

  it('«التسجيلات» is for the teacher and the admin only', () => {
    open('assistant');
    expect(screen.queryByRole('button', { name: t.classroom.recordings.title })).toBeNull();
  });

  it('lists the lesson’s recordings with a status and a download link for the finished one', async () => {
    api.fetch.mockResolvedValue(REC);
    open('teacher');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.recordings.title }));
    const panel = screen.getByRole('dialog', { name: t.classroom.recordings.title });
    expect(await within(panel).findByText(t.classroom.recordings.status.done)).toBeTruthy();
    expect(within(panel).getByText(t.classroom.recordings.status.recording)).toBeTruthy();
    expect(within(panel).getAllByRole('link')).toHaveLength(1);
    expect(within(panel).getByRole('link').getAttribute('href')).toBe('https://files.test/r1.mp4');
    expect(api.fetch).toHaveBeenCalledWith('/lessons/L1/recordings');
  });

  it('says so when there are none', async () => {
    api.fetch.mockResolvedValueOnce([]);
    open('admin');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.recordings.title }));
    expect(await screen.findByText(t.classroom.recordings.empty)).toBeTruthy();
  });

  it('shows the error line when the list fails', async () => {
    api.fetch.mockRejectedValue(new ApiError(500, null));
    open('admin');
    fireEvent.click(screen.getByRole('button', { name: t.classroom.recordings.title }));
    expect(await screen.findByText(t.classroom.recordings.error)).toBeTruthy();
  });

  it('shows «جارٍ التسجيل» in the room while LiveKit records', () => {
    const c = open('guest');
    expect(screen.queryByText(t.classroom.recordingNow)).toBeNull();
    act(() => c.push({ isRecording: true }));
    expect(screen.getByText(t.classroom.recordingNow)).toBeTruthy();
  });
});
