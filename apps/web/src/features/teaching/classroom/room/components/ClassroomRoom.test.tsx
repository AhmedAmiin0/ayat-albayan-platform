import type { RoomJoinResult } from '@ab/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ClassroomRoom } from './ClassroomRoom';
import { fakeClient, tile, type FakeClient } from '../livekit/fake-client';

const JOIN: RoomJoinResult = { url: 'wss://lk.test', token: 'tok', room: 'lesson-1', role: 'teacher' };

function open(client: FakeClient, onRejoin?: () => void) {
  return render(<ClassroomRoom join={JOIN} make={() => client} {...(onRejoin && { onRejoin })} />);
}

const TILES = [
  tile({ key: 'me', name: 'أبرار', isLocal: true, hasVideo: true }),
  tile({ key: 'sohaila', name: 'سهيلة', micOn: false }),
];

describe('ClassroomRoom', () => {
  it('connects with the url and token, and lists everyone with names', async () => {
    const c = fakeClient({ tiles: TILES });
    open(c);
    expect(c.connect).toHaveBeenCalledWith('wss://lk.test', 'tok');
    expect(await screen.findByText(`أبرار (${t.classroom.you})`)).toBeTruthy();
    expect(screen.getByText('سهيلة')).toBeTruthy();
    expect(screen.getByText(t.classroom.participants.replace('{n}', '2'))).toBeTruthy();
  });

  it('says «مستني الباقيين» while alone', () => {
    open(fakeClient({ tiles: [TILES[0] as (typeof TILES)[number]] }));
    expect(screen.getByText(t.classroom.waiting)).toBeTruthy();
  });

  it('marks the speaker with the word, and a muted person with the word', () => {
    const c = fakeClient({ tiles: [tile({ key: 'a', name: 'سهيلة', speaking: true, micOn: false })] });
    open(c);
    expect(screen.getByText(t.classroom.speaking)).toBeTruthy();
    expect(screen.getByText(t.classroom.muted)).toBeTruthy();
    expect(screen.getByLabelText('سهيلة').getAttribute('data-speaking')).toBe('true');
    act(() => c.push({ tiles: [tile({ key: 'a', name: 'سهيلة' })] }));
    expect(screen.queryByText(t.classroom.speaking)).toBeNull();
  });

  it('toggles mic, camera and screen share, and the labels flip', async () => {
    const c = fakeClient({ tiles: TILES });
    open(c);
    fireEvent.click(screen.getByRole('button', { name: t.classroom.micOn }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.camOn }));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.shareOn }));
    expect(c.setMic).toHaveBeenCalledWith(true);
    expect(c.setCamera).toHaveBeenCalledWith(true);
    expect(c.setShare).toHaveBeenCalledWith(true);
    expect(await screen.findByRole('button', { name: t.classroom.micOff })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.classroom.camOff })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.classroom.shareOff })).toBeTruthy();
  });

  it('shows «شغّل الصوت» only while autoplay is blocked, and starts the audio', async () => {
    const c = fakeClient({ tiles: TILES, canPlayAudio: false });
    open(c);
    fireEvent.click(screen.getByRole('button', { name: t.classroom.enableAudio }));
    expect(c.startAudio).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('button', { name: t.classroom.enableAudio })).toBeNull());
  });

  it('a duplicate identity closes the room with its message and no rejoin', () => {
    const c = fakeClient({ tiles: TILES });
    open(c, () => undefined);
    act(() => c.push({ status: 'duplicate' }));
    expect(screen.getByText(t.classroom.error.duplicate)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.rejoin })).toBeNull();
  });

  it('leaving shows «خرجت من الحلقة» and a rejoin button', () => {
    let rejoined = false;
    const c = fakeClient({ tiles: TILES });
    open(c, () => (rejoined = true));
    fireEvent.click(screen.getByRole('button', { name: t.classroom.leave }));
    expect(c.disconnect).toHaveBeenCalled();
    expect(screen.getByText(t.classroom.ended)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.rejoin }));
    expect(rejoined).toBe(true);
  });

  it('shows «بنعيد الاتصال» while reconnecting', () => {
    open(fakeClient({ tiles: TILES, status: 'reconnecting' }));
    expect(screen.getByText(t.classroom.reconnecting)).toBeTruthy();
  });
});
