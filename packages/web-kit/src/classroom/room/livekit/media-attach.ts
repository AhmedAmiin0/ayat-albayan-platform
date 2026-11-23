import { Track, type Room } from 'livekit-client';

/** Finds the camera / screen track behind a tile key (`<identity>` or `<identity>:screen`). */
export function trackOfTile(room: Room, tileKey: string): Track | undefined {
  const screen = tileKey.endsWith(':screen');
  const identity = screen ? tileKey.slice(0, -':screen'.length) : tileKey;
  const p = room.localParticipant.identity === identity ? room.localParticipant : room.remoteParticipants.get(identity);
  return p?.getTrackPublication(screen ? Track.Source.ScreenShare : Track.Source.Camera)?.track;
}

/** One <video> per track: attach now, return the detach (React cleanup). */
export function attachTrack(room: Room, tileKey: string, el: HTMLVideoElement): () => void {
  const track = trackOfTile(room, tileKey);
  track?.attach(el);
  return () => void track?.detach(el);
}
