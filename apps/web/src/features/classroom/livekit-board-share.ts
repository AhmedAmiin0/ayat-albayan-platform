import { Track, type Room } from 'livekit-client';
import { BOARD_TRACK_NAME } from './snapshot';

/**
 * «مشاركة السبورة»: the board canvas goes out as the screen-share track, so the recording and the
 * mobile clients see it like a shared screen. One screen-share source per person: a running screen
 * share stops first. Returns a setter that keeps the published track between calls.
 */
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
