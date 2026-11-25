// The player's one door to the native audio module: the UI and its rules
// (@ab/client-core playerReducer) never import a media library. Each app passes its own
// CreateAudioSource to <AudioPlayer> (family-mobile: the expo-audio adapter).

/** What the media reports back; positions and lengths in seconds. */
export interface AudioSourceEvents {
  onLoaded: (duration: number) => void;
  onTime: (position: number) => void;
  onEnded: () => void;
  onFailed: () => void;
}

/** The commands the player sends. `release` frees the native player (on unmount). */
export interface AudioSource {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setRate: (rate: number) => void;
  release: () => void;
}

export interface AudioSourceInput {
  /** A signed link to the file (an hour; the player range-reads it). */
  url: string;
  /** Where to start (the saved stop). */
  startAt: number;
  events: AudioSourceEvents;
}

export type CreateAudioSource = (input: AudioSourceInput) => AudioSource;
