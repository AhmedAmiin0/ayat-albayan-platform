import { createContext, use } from 'react';

// What the chat needs from the phone that the kit does not carry (docs/31 §2): a picker, the
// recorder and a player live in each app (expo-image-picker, expo-document-picker, expo-audio),
// passed in as this port. An app without one gets text only: no attach, no microphone, and a
// voice note opens in the phone's own player.

/** A picked or recorded file, its bytes ready for the signed upload. */
export interface ChannelPickedFile {
  mime: string;
  /** The name the others see (a PDF's title). */
  name: string;
  size: number;
  /** An ArrayBuffer: React Native uploads it reliably, a Blob it does not. */
  bytes: ArrayBuffer;
  /** A voice note's length. */
  durationMs?: number;
}

export interface ChannelVoiceStatus {
  playing: boolean;
  positionMs: number;
  durationMs: number;
}

/** One voice note's player; `release` once the bubble leaves the screen. */
export interface ChannelVoicePlayer {
  toggle: () => void;
  seek: (fraction: number) => void;
  release: () => void;
}

/** The microphone: `start` resolves false when it may not record (no permission). */
export interface ChannelRecorder {
  start: () => Promise<boolean>;
  /** The note to send, or null when nothing was recorded. */
  stop: () => Promise<ChannelPickedFile | null>;
  cancel: () => void;
  /** How long the note has been recording, for the bar's clock; absent → the kit counts. */
  elapsedMs?: () => number;
}

export interface ChannelMediaPort {
  pickPhoto?: () => Promise<ChannelPickedFile | null>;
  /** A photo taken now with the camera (its permission asked by the app). */
  pickCamera?: () => Promise<ChannelPickedFile | null>;
  pickPdf?: () => Promise<ChannelPickedFile | null>;
  recorder?: ChannelRecorder;
  playVoice?: (input: {
    url: string;
    onStatus: (status: ChannelVoiceStatus) => void;
  }) => ChannelVoicePlayer;
}

/** Text only: no picker, no recorder, no player. */
export const NO_MEDIA: ChannelMediaPort = {};

export const ChannelMediaContext = createContext<ChannelMediaPort>(NO_MEDIA);

/** The app's port, or none (text only). */
export const useChannelMedia = (): ChannelMediaPort => use(ChannelMediaContext);
