import { roleOfMeta } from '@ab/shared';
import type { RoomSnapshot, RoomStatus, TileView } from './room-types';

// Structural slices of livekit-client's Room / Participant, so this file is pure and testable.
export interface PublicationLike {
  source: string;
  isMuted: boolean;
  trackName?: string | undefined;
  track?: { sid?: string | undefined; mediaStreamTrack: { id: string } } | undefined;
}

export interface ParticipantLike {
  identity: string;
  name?: string | undefined;
  metadata?: string | undefined;
  isLocal: boolean;
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
  trackPublications: Map<string, PublicationLike>;
}

export interface RoomLike {
  localParticipant: ParticipantLike;
  remoteParticipants: Map<string, ParticipantLike>;
  canPlaybackAudio: boolean;
  isRecording?: boolean | undefined;
}

/** The track name the whiteboard is published under (Track.Source.ScreenShare). */
export const BOARD_TRACK_NAME = 'board';

const revOf = (pub: PublicationLike | undefined): string =>
  pub?.track ? (pub.track.sid ?? pub.track.mediaStreamTrack.id) : '';

export function pubOf(p: ParticipantLike, source: string): PublicationLike | undefined {
  return [...p.trackPublications.values()].find((x) => x.source === source);
}

const isBoardPub = (pub: PublicationLike | undefined): boolean => pub?.trackName === BOARD_TRACK_NAME;

/** The camera tile (always) and, while someone shares, a screen tile for them. */
export function tilesOf(p: ParticipantLike, speakingIds: ReadonlySet<string>): TileView[] {
  const cam = pubOf(p, 'camera');
  const screen = pubOf(p, 'screen_share');
  const base = { identity: p.identity, name: p.name || p.identity, isLocal: p.isLocal, role: roleOfMeta(p.metadata) };
  const tiles: TileView[] = [
    {
      ...base,
      key: p.identity,
      kind: 'camera',
      speaking: p.isSpeaking || speakingIds.has(p.identity),
      micOn: p.isMicrophoneEnabled,
      hasVideo: Boolean(cam?.track) && !cam?.isMuted,
      videoRev: revOf(cam),
      isBoard: false,
    },
  ];
  if (screen?.track) {
    tiles.push({
      ...base,
      key: `${p.identity}:screen`,
      kind: 'screen',
      speaking: false,
      micOn: true,
      hasVideo: true,
      videoRev: revOf(screen),
      isBoard: isBoardPub(screen),
    });
  }
  return tiles;
}

/** Everything the UI draws, read off the room in one pass. */
export function snapshotOf(room: RoomLike, status: RoomStatus, speakingIds: ReadonlySet<string>): RoomSnapshot {
  const everyone = [room.localParticipant, ...room.remoteParticipants.values()];
  const me = room.localParticipant;
  const boardShareOn = me.isScreenShareEnabled && isBoardPub(pubOf(me, 'screen_share'));
  return {
    status,
    tiles: everyone.flatMap((p) => tilesOf(p, speakingIds)),
    canPlayAudio: room.canPlaybackAudio,
    micOn: me.isMicrophoneEnabled,
    camOn: me.isCameraEnabled,
    shareOn: me.isScreenShareEnabled && !boardShareOn,
    boardShareOn,
    isRecording: room.isRecording ?? false,
  };
}
