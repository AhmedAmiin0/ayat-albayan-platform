import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import { useEffect, useRef } from 'react';
import { claimPlayback, releasePlayback } from '../../messages/media/playback';

/** AAC in MP4, mono, 48 kbps (~360 KB a minute), with the level for the bars. Read when mounted: never at import. */
const voiceOptions = (): RecordingOptions => ({ ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 48_000, isMeteringEnabled: true });
const OWNER = 'voice-recorder';

/** recording; asked = the system prompt was shown (the next press records, as WhatsApp); blocked = only Settings can allow it. */
export type StartResult = 'recording' | 'asked' | 'blocked' | 'failed';

/** A stopped recording's file and length. */
export interface Recorded {
  uri: string;
  ms: number;
}

/**
 * expo-audio's recorder for one chat's composer. The order matters on Android (AudioRecorder.kt):
 * the permission first, then prepare (it silently skips configuring without it), then canRecord,
 * then record(); every stop releases the MediaRecorder, so each recording prepares again.
 * `onInterrupt` runs when a voice note starts playing meanwhile (claimPlayback). Stops on unmount.
 */
export function useVoiceRecorder(onInterrupt: () => void) {
  const recorder = useAudioRecorder(voiceOptions());
  const state = useAudioRecorderState(recorder, 100);
  const interrupt = useRef(onInterrupt);
  useEffect(() => {
    interrupt.current = onInterrupt;
  }, [onInterrupt]);

  const start = async (): Promise<StartResult> => {
    try {
      const now = await getRecordingPermissionsAsync();
      if (!now.granted) {
        if (!now.canAskAgain) return 'blocked';
        const asked = await requestRecordingPermissionsAsync();
        return asked.granted || asked.canAskAgain ? 'asked' : 'blocked';
      }
      // Pauses a voice note that is playing; a note started later stops this recording.
      claimPlayback(OWNER, () => interrupt.current());
      await recorder.prepareToRecordAsync();
      if (!recorder.getStatus().canRecord) return 'failed';
      recorder.record();
      return 'recording';
    } catch {
      return 'failed';
    }
  };

  /** Stops (if recording) and gives the file, or null when there is none. Never throws. */
  const stop = async (): Promise<Recorded | null> => {
    releasePlayback(OWNER);
    try {
      const ms = recorder.getStatus().durationMillis;
      if (recorder.isRecording) await recorder.stop();
      return recorder.uri ? { uri: recorder.uri, ms } : null;
    } catch {
      return null;
    }
  };

  // Leaving the chat mid-recording: the microphone is closed (the file is never sent).
  useEffect(
    () => () => {
      releasePlayback(OWNER);
      try {
        if (recorder.isRecording) void recorder.stop().catch(() => undefined);
      } catch {
        // already released with the component
      }
    },
    [recorder],
  );

  return { start, stop, ms: state.durationMillis, level: state.metering ?? null };
}
