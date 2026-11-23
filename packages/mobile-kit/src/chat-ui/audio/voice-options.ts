import { RecordingPresets, type RecordingOptions } from 'expo-audio';

/**
 * A voice note's recording (the inbox composer and the student chat): AAC in MP4, mono, 48 kbps
 * (~360 KB a minute), with the level for the bars. Read when mounted: never at import.
 */
export const voiceOptions = (): RecordingOptions => ({
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 48_000,
  isMeteringEnabled: true,
});
