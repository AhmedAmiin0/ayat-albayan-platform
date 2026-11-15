import type { Room } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';
import { boardSharer } from './livekit-board-share';

vi.mock('livekit-client', () => ({ Track: { Source: { ScreenShare: 'screen_share' } } }));

function fakeRoom(sharingScreen = false) {
  const me = {
    isScreenShareEnabled: sharingScreen,
    publishTrack: vi.fn(() => Promise.resolve()),
    unpublishTrack: vi.fn(() => Promise.resolve()),
    setScreenShareEnabled: vi.fn(() => Promise.resolve()),
  };
  return { room: { localParticipant: me } as unknown as Room, me };
}

const track = (id: string) => ({ id }) as unknown as MediaStreamTrack;

describe('boardSharer', () => {
  it('publishes the canvas track as the screen share named «board», and unpublishes it', async () => {
    const { room, me } = fakeRoom();
    const set = boardSharer(room);
    const a = track('a');
    await set(a);
    expect(me.publishTrack).toHaveBeenCalledWith(a, { source: 'screen_share', name: 'board' });
    await set(null);
    expect(me.unpublishTrack).toHaveBeenCalledWith(a, true);
    await set(null);
    expect(me.unpublishTrack).toHaveBeenCalledTimes(1);
  });

  it('stops a running screen share first, and replaces an earlier board track', async () => {
    const { room, me } = fakeRoom(true);
    const set = boardSharer(room);
    await set(track('a'));
    expect(me.setScreenShareEnabled).toHaveBeenCalledWith(false);
    await set(track('b'));
    expect(me.unpublishTrack).toHaveBeenCalledWith(track('a'), true);
    expect(me.publishTrack).toHaveBeenLastCalledWith(track('b'), { source: 'screen_share', name: 'board' });
  });
});
