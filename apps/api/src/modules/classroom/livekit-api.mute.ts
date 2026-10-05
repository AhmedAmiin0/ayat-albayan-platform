import type { MuteSource } from '@ab/shared';
import type { LivekitApi } from './livekit-api';

/** LiveKit's TrackSource as protojson names it, and as its number (CAMERA = 1, MICROPHONE = 2). */
const SOURCE: Record<MuteSource, { name: string; num: number }> = {
  camera: { name: 'CAMERA', num: 1 },
  microphone: { name: 'MICROPHONE', num: 2 },
};

export interface MuteTrackInput {
  room: string;
  identity: string;
  source: MuteSource;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

/** The sid of the participant's published track of `source`, or null when they publish none. */
export function trackSidOf(participant: Obj, source: MuteSource): string | null {
  const want = SOURCE[source];
  const tracks = Array.isArray(participant.tracks) ? participant.tracks.filter(isObj) : [];
  const hit = tracks.find((t) => t.source === want.name || t.source === want.num);
  return typeof hit?.sid === 'string' ? hit.sid : null;
}

/**
 * «كتم الميكروفون» / «إيقاف الكاميرا»: GetParticipant → the track of that source → MutePublishedTrack
 * (muted: true). The participant may unmute themselves afterwards. 'none' when nothing of that
 * source is published (already off): nothing to do. Throws LivekitError (not_found when gone).
 */
export async function muteTrack(api: LivekitApi, input: MuteTrackInput): Promise<'muted' | 'none'> {
  const grant = { roomAdmin: true, room: input.room };
  const participant = await api.call({ method: 'livekit.RoomService/GetParticipant', body: { room: input.room, identity: input.identity }, grant });
  const sid = trackSidOf(participant, input.source);
  if (sid === null) return 'none';
  const body = { room: input.room, identity: input.identity, track_sid: sid, muted: true };
  await api.call({ method: 'livekit.RoomService/MutePublishedTrack', body, grant });
  return 'muted';
}
