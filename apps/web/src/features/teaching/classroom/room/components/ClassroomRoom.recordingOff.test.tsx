import type { JoinRole } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ClassroomRoom } from './ClassroomRoom';
import { fakeClient, tile } from '../livekit/fake-client';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const R = t.classroom.recordings;

function open(role: JoinRole, opts: { room?: string; recording?: 'on' | 'off' } = {}) {
  const c = fakeClient({ tiles: [tile({ key: 'me', isLocal: true, role })] });
  const join = { url: 'wss://lk.test', token: 'tok', room: opts.room ?? 'lesson-L1', role, recording: opts.recording ?? 'on' };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ClassroomRoom join={join} make={() => c} />
    </QueryClientProvider>,
  );
}

describe('every room is recorded', () => {
  it('the admin is told when the server cannot record; nobody else is', () => {
    open('admin', { recording: 'off' });
    expect(screen.getByText(R.notConfigured)).toBeTruthy();
  });

  it('no warning while recording works, nor for a teacher', () => {
    open('admin');
    expect(screen.queryByText(R.notConfigured)).toBeNull();
  });

  it('an internal meeting’s room lists the meeting’s recordings', async () => {
    apiFetch.mockResolvedValue([]);
    open('teacher', { room: 'meeting-M1' });
    fireEvent.click(screen.getByRole('button', { name: R.title }));
    const panel = screen.getByRole('dialog', { name: R.title });
    expect(await within(panel).findByText(R.emptyMeeting)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/meetings/M1/recordings');
  });
});

describe('teacher sees no warning', () => {
  it('even when recording is off (the admin sets it up)', () => {
    open('teacher', { recording: 'off' });
    expect(screen.queryByText(R.notConfigured)).toBeNull();
  });
});
