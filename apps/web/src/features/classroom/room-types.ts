/** What the room UI knows about a call. livekit-client stays behind RoomClient so tests inject a fake. */

export type RoomStatus = 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'duplicate';

/** One square of the grid: a person's camera, or a screen they share. */
export interface TileView {
  /** Stable key: the identity, or `<identity>:screen`. */
  key: string;
  name: string;
  isLocal: boolean;
  kind: 'camera' | 'screen';
  speaking: boolean;
  micOn: boolean;
  hasVideo: boolean;
  /** Changes when the underlying video track changes, so the <video> re-attaches. */
  videoRev: string;
}

export interface RoomSnapshot {
  status: RoomStatus;
  tiles: TileView[];
  canPlayAudio: boolean;
  micOn: boolean;
  camOn: boolean;
  shareOn: boolean;
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
}

export const EMPTY_SNAPSHOT: RoomSnapshot = {
  status: 'connecting',
  tiles: [],
  canPlayAudio: true,
  micOn: false,
  camOn: false,
  shareOn: false,
};
