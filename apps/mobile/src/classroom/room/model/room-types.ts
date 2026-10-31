import type { ComponentType } from 'react';

/** A platform room: a lesson's classroom or an internal / sales meeting (docs/35). */
export type RoomKind = 'lesson' | 'meeting';

export interface RoomTarget {
  kind: RoomKind;
  id: string;
}

/**
 * The LiveKit connection as the room screen sees it (the client maps LiveKit's events to these).
 */
export type RoomStatus =
  'connecting' | 'connected' | 'reconnecting' | 'ended' | 'removed' | 'duplicate';

/** One tile of the grid: a participant's camera, or a shared screen (viewing only). */
export interface RoomTile {
  key: string;
  name: string;
  local: boolean;
  screen: boolean;
  micOn: boolean;
  speaking: boolean;
  /** What the platform's Video draws (a LiveKit track reference); null = the name card. */
  video: unknown;
}

export interface RoomSnapshot {
  status: RoomStatus;
  tiles: readonly RoomTile[];
  micOn: boolean;
  camOn: boolean;
}

export const EMPTY_SNAPSHOT: RoomSnapshot = {
  status: 'connecting',
  tiles: [],
  micOn: false,
  camOn: false,
};

/** What joining needs: the answer of the same join endpoint the web room uses. */
export interface RoomCredentials {
  url: string;
  token: string;
}

export interface MediaWish {
  mic: boolean;
  cam: boolean;
}

export interface RoomClient {
  /**
   * Connects, then turns on what `media` asks for; a refused device stays off (never a failed
   * join).
   */
  connect: (join: RoomCredentials, media: MediaWish) => Promise<void>;
  disconnect: () => void;
  /** The screen is gone: disconnects, and a pending or later connect rejects (no room left). */
  close: () => void;
  snapshot: () => RoomSnapshot;
  subscribe: (listener: () => void) => () => void;
  setMic: (on: boolean) => Promise<void>;
  setCamera: (on: boolean) => Promise<void>;
  /** Front ↔ back; resolves to true when the front camera is in use afterwards. */
  switchCamera: () => Promise<boolean>;
}

/** A permission answer: `blocked` = «don't ask again», only the device settings can lift it. */
export type MediaAnswer = 'granted' | 'denied' | 'blocked';

export interface CamMicAnswer {
  mic: MediaAnswer;
  cam: MediaAnswer;
}

/** A camera opened before joining: its stream for the preview, and how to close it. */
export interface PreviewCamera {
  streamUrl: string;
  stop: () => void;
}

export interface RoomAudio {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** true = the loudspeaker, false = the earpiece. */
  route: (speaker: boolean) => Promise<void>;
}

/** Everything native the room screen uses; tests inject a fake one. */
export interface RoomPlatform {
  createClient: () => RoomClient;
  Video: ComponentType<{ video: unknown; mirror: boolean }>;
  PreviewVideo: ComponentType<{ streamUrl: string }>;
  openPreview: () => Promise<PreviewCamera | null>;
  media: { check: () => Promise<CamMicAnswer>; ask: () => Promise<CamMicAnswer> };
  audio: RoomAudio;
}
