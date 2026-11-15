import type { RoomSnapshot, RoomStatus, RoomTile } from './room-types';

// The few LiveKit shapes the grid reads, structurally (livekit-client is loaded lazily, docs/35):
// the tiles are built here, purely, so the grid is tested without the SDK.

export type SourceName = 'camera' | 'screen_share';

export interface PublicationLike {
  isMuted: boolean;
  track?: unknown;
}

export interface ParticipantLike {
  identity: string;
  name?: string | undefined;
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
}

export interface RoomLike<P extends ParticipantLike> {
  local: P;
  remotes: readonly P[];
  /** The participant's publication of a source, if any. */
  publication: (p: P, source: SourceName) => PublicationLike | undefined;
  /** A track reference for the platform's Video. */
  videoRef: (p: P, source: SourceName) => unknown;
}

const shown = (pub: PublicationLike | undefined): boolean =>
  Boolean(pub?.track) && pub?.isMuted === false;

function tilesOf<P extends ParticipantLike>(room: RoomLike<P>, p: P, local: boolean): RoomTile[] {
  const name = p.name?.trim() ? p.name.trim() : p.identity;
  const base = { name, local, micOn: p.isMicrophoneEnabled, speaking: p.isSpeaking };
  const cam = room.publication(p, 'camera');
  const tiles: RoomTile[] = [
    {
      ...base,
      key: `${p.identity}:camera`,
      screen: false,
      video: shown(cam) ? room.videoRef(p, 'camera') : null,
    },
  ];
  const share = room.publication(p, 'screen_share');
  if (shown(share)) {
    tiles.push({
      ...base,
      key: `${p.identity}:screen`,
      screen: true,
      video: room.videoRef(p, 'screen_share'),
    });
  }
  return tiles;
}

/** Everyone's tiles (oneself included) and one's own mic / camera state. */
export function snapshotOf<P extends ParticipantLike>(
  room: RoomLike<P>,
  status: RoomStatus,
): RoomSnapshot {
  const tiles = [
    ...tilesOf(room, room.local, true),
    ...room.remotes.flatMap((p) => tilesOf(room, p, false)),
  ];
  return {
    status,
    tiles,
    micOn: room.local.isMicrophoneEnabled,
    camOn: room.local.isCameraEnabled,
  };
}
