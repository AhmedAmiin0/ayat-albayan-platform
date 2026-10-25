import { roleOfMeta } from '@ab/shared';
import type { RoomSnapshot, RoomStatus, TileView } from '../components/room-types';

// Structural slices of livekit-client's Room / Participant, so this file is pure and testable.
export interface PublicationLike {
  source: string;
  isMuted: boolean;
  trackName?: string | undefined;
  track?: { sid?: string | undefined; mediaStreamTrack: { id: string } } | undefined;
}

/** livekit-client's ParticipantPermission: `canPublishSources` empty = every source. */
export interface PermissionLike {
  canPublish: boolean;
  canPublishSources: readonly number[];
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
  permissions?: PermissionLike | undefined;
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

/** TrackSource.SCREEN_SHARE in LiveKit's protocol. */
const SCREEN_SHARE_SOURCE = 3;

/**
 * May this participant publish a screen share? Read off LiveKit's live permission (a guest's token
 * allows camera + microphone only, until a staff «سماح» updates it); before the server has sent
 * one, a guest may not and everyone else may.
 */
export function mayShareScreen(p: Pick<ParticipantLike, 'permissions' | 'metadata'>): boolean {
  const perm = p.permissions;
  if (!perm) return roleOfMeta(p.metadata) !== 'guest';
  return perm.canPublish && (perm.canPublishSources.length === 0 || perm.canPublishSources.includes(SCREEN_SHARE_SOURCE));
}

const isBoardPub = (pub: PublicationLike | undefined): boolean => pub?.trackName === BOARD_TRACK_NAME;

/** The camera tile (always) and, while someone shares, a screen tile for them. */
export function tilesOf(p: ParticipantLike, speakingIds: ReadonlySet<string>): TileView[] {
  const cam = pubOf(p, 'camera');
  const screen = pubOf(p, 'screen_share');
  const base = {
    identity: p.identity,
    name: p.name || p.identity,
    isLocal: p.isLocal,
    role: roleOfMeta(p.metadata),
    shareAllowed: mayShareScreen(p),
  };
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
    shareAllowed: mayShareScreen(me),
  };
}
