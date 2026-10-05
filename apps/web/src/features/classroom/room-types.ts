import type { JoinRole } from '@ab/shared';

/** What the room UI knows about a call. livekit-client stays behind RoomClient so tests inject a fake. */

export type RoomStatus = 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'duplicate' | 'removed';

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
  /** Their token (or a staff «سماح») lets them publish a screen share. */
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
  /** This participant may publish a screen share now (staff always; a guest after «سماح»). */
  shareAllowed: boolean;
}

export type MediaDevice = 'mic' | 'cam';
export interface MediaFailure {
  device: MediaDevice;
  error: unknown;
}

export interface RoomClient {
  /** Joins; mic and camera that could not start come back as failures (the call still works). */
  connect(url: string, token: string): Promise<MediaFailure[]>;
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
