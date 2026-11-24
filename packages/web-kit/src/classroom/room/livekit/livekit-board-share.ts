import { Track, type Room } from 'livekit-client';
import { BOARD_TRACK_NAME } from './snapshot';

/** Published as the screen-share track so recordings and mobile see it; one source per person. */
export function boardSharer(room: Room): (track: MediaStreamTrack | null) => Promise<void> {
  let current: MediaStreamTrack | null = null;
  return async (track) => {
    const me = room.localParticipant;
    if (current) {
      await me.unpublishTrack(current, true);
      current = null;
    }
    if (!track) return;
    if (me.isScreenShareEnabled) await me.setScreenShareEnabled(false);
    await me.publishTrack(track, { source: Track.Source.ScreenShare, name: BOARD_TRACK_NAME });
    current = track;
  };
}
