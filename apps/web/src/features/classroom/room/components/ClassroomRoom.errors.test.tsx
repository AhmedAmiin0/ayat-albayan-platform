import type { RoomJoinResult } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ClassroomRoom } from './ClassroomRoom';
import { fakeClient, tile } from '../livekit/fake-client';

const JOIN: RoomJoinResult = { url: 'wss://lk.test', token: 'tok', room: 'lesson-1', role: 'teacher' };
const named = (name: string) => Object.assign(new Error(name), { name });

describe('ClassroomRoom errors', () => {
  it('a denied mic and a missing camera are worded, and the call goes on', async () => {
    const c = fakeClient({ tiles: [tile({ key: 'me', isLocal: true })] }, [
      { device: 'mic', error: named('NotAllowedError') },
      { device: 'cam', error: named('NotFoundError') },
    ]);
    render(<ClassroomRoom join={JOIN} make={() => c} />);
    expect(await screen.findByText(t.classroom.error.mic_denied)).toBeTruthy();
    expect(screen.getByText(t.classroom.error.device_missing)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.classroom.leave })).toBeTruthy();
  });

  it('a failed screen share says so', async () => {
    const c = fakeClient({ tiles: [tile({ key: 'me', isLocal: true })] });
    c.setShare.mockRejectedValue(named('NotAllowedError'));
    render(<ClassroomRoom join={JOIN} make={() => c} />);
    fireEvent.click(screen.getByRole('button', { name: t.classroom.shareOn }));
    expect(await screen.findByText(t.classroom.error.share_failed)).toBeTruthy();
  });

  it('a connect failure closes the room with a retry', async () => {
    const c = fakeClient();
    c.connect.mockRejectedValue(new Error('boom'));
    let again = 0;
    render(<ClassroomRoom join={JOIN} make={() => c} onRejoin={() => again++} />);
    expect(await screen.findByText(t.classroom.error.connect_failed)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.rejoin }));
    expect(again).toBe(1);
  });
});
