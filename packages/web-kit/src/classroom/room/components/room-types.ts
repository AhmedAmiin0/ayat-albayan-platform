import type { JoinRole, MuteSource } from '@ab/schedule';

/** What the room UI knows about a call. livekit-client stays behind RoomClient so tests inject a fake. */

/** `closed`: the room was ended for everyone, or by the server's closer. */
export type RoomStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'closed'
  | 'duplicate'
  | 'removed';

/** One square of the grid: a person's camera, or a screen they share. */
export interface TileView {
  /** Stable key: the identity, or `<identity>:screen`. */
  key: string;
  /** The LiveKit identity (the remove call's `:identity`). */
  identity: string;
  name: string;
  /** From the token metadata; null when absent or malformed. */
  role: JoinRole | null;
  isLocal: boolean;
  kind: 'camera' | 'screen';
  speaking: boolean;
  micOn: boolean;
  hasVideo: boolean;
  /** Changes when the underlying video track changes, so the <video> re-attaches. */
  videoRev: string;
  /** A screen tile that carries someone's shared whiteboard, not their screen. */
  isBoard: boolean;
  /** Their token, or a staff grant, lets them publish a screen share. */
  shareAllowed: boolean;
}

export interface RoomSnapshot {
  status: RoomStatus;
  tiles: TileView[];
  canPlayAudio: boolean;
  micOn: boolean;
  camOn: boolean;
  shareOn: boolean;
  /** The local whiteboard is published as the screen-share track. */
  boardShareOn: boolean;
  /** LiveKit egress is recording the room. */
  isRecording: boolean;
  /** Staff always; a guest after a grant. */
  shareAllowed: boolean;
}

export type MediaDevice = 'mic' | 'cam';

/** What the device check chose: which of mic / camera start on joining, and on which device. */
export interface MediaChoice {
  mic: boolean;
  cam: boolean;
  micId?: string | undefined;
  camId?: string | undefined;
}

/** No device check (staff): both start, on the browser's default devices. */
export const BOTH_ON: MediaChoice = { mic: true, cam: true };
export interface MediaFailure {
  device: MediaDevice;
  error: unknown;
}

export interface RoomClient {
  /**
   * Joins; mic and camera that could not start come back as failures (the call still works).
   * `media` (default both on) is the device check's choice.
   */
  connect(url: string, token: string, media?: MediaChoice): Promise<MediaFailure[]>;
  disconnect(): void;
  snapshot(): RoomSnapshot;
  subscribe(listener: (snap: RoomSnapshot) => void): () => void;
  setMic(on: boolean): Promise<void>;
  setCamera(on: boolean): Promise<void>;
  setShare(on: boolean): Promise<void>;
  startAudio(): Promise<void>;
  /** Shows the tile's video in `el`; the returned function detaches it. */
  attachVideo(tileKey: string, el: HTMLVideoElement): () => void;
  /** Reliable data to everyone (or only `to`) on `topic`. */
  sendData(bytes: Uint8Array, opts: DataSendOptions): Promise<void>;
  /** Every data packet from another participant; returns the unsubscribe. */
  onData(listener: (packet: DataPacketIn) => void): () => void;
  /** Publishes a canvas track as the screen share (the whiteboard); null stops it. */
  setBoardTrack(track: MediaStreamTrack | null): Promise<void>;
  /** A staff member muted my mic or camera; returns the unsubscribe. */
  onModerated(listener: (e: ModeratedEvent) => void): () => void;
}

export interface ModeratedEvent {
  source: MuteSource;
}

export interface DataSendOptions {
  topic: string;
  to?: string[];
}

export interface DataPacketIn {
  bytes: Uint8Array;
  topic: string | undefined;
  from: { identity: string; role: JoinRole | null };
}

export const EMPTY_SNAPSHOT: RoomSnapshot = {
  status: 'connecting',
  tiles: [],
  canPlayAudio: true,
  micOn: false,
  camOn: false,
  shareOn: false,
  boardShareOn: false,
  isRecording: false,
  shareAllowed: false,
};
