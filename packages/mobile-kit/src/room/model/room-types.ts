import type { JoinRole } from '@ab/shared';
import type { ComponentType } from 'react';
import type { AudioOutput } from './audio-output';

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
  'connecting' | 'connected' | 'reconnecting' | 'ended' | 'dropped' | 'removed' | 'duplicate';

/** One tile of the grid: a participant's camera, or a shared screen (viewing only). */
export interface RoomTile {
  key: string;
  /** The LiveKit identity (`<role>-<hex>`) the host's mute and remove name. */
  identity: string;
  /** From the token's metadata; null when absent or malformed. */
  role: JoinRole | null;
  name: string;
  local: boolean;
  screen: boolean;
  micOn: boolean;
  camOn: boolean;
  speaking: boolean;
  /** What the platform's Video draws (a LiveKit track reference); null = the name card. */
  video: unknown;
}

export interface RoomSnapshot {
  status: RoomStatus;
  tiles: readonly RoomTile[];
  micOn: boolean;
  camOn: boolean;
  /** LiveKit egress is recording the room. */
  recording: boolean;
}

export const EMPTY_SNAPSHOT: RoomSnapshot = {
  status: 'connecting',
  tiles: [],
  micOn: false,
  camOn: false,
  recording: false,
};

/** What joining needs: the answer of the same join endpoint the web room uses. */
export interface RoomCredentials {
  url: string;
  token: string;
  /** One's role in this room (the join answer): the host controls are the teacher's / admin's. */
  role: JoinRole | null;
  /** false on a trial lesson: no chat between the family and the teacher yet. */
  chat: boolean;
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
  /** The output LiveKit chose (a headset or bluetooth first); null where the OS routes (iOS). */
  current: () => Promise<AudioOutput | null>;
  /** The speaker button: the next output (Android), or the system's route picker (iOS). */
  next: (current: AudioOutput | null) => Promise<AudioOutput | null>;
}

/** The last device choice, kept on the phone: later joins skip the preview with it. */
export interface DeviceMemory {
  load: () => Promise<MediaWish | null>;
  save: (wish: MediaWish) => Promise<void>;
}

/** Everything native the room screen uses; tests inject a fake one. */
export interface RoomPlatform {
  createClient: () => RoomClient;
  /** `contain` for a shared screen (never cropped), `cover` for a camera. */
  Video: ComponentType<{ video: unknown; mirror: boolean; fit: 'cover' | 'contain' }>;
  PreviewVideo: ComponentType<{ streamUrl: string }>;
  openPreview: () => Promise<PreviewCamera | null>;
  media: { check: () => Promise<CamMicAnswer>; ask: () => Promise<CamMicAnswer> };
  audio: RoomAudio;
  devices: DeviceMemory;
}
