import { Platform } from 'react-native';
import type { RoomAudio } from '@/classroom/room/model/room-types';
import type { LiveKitNative } from './livekit-native';

const quiet = (p: Promise<unknown>): Promise<void> =>
  p.then(
    () => undefined,
    () => undefined,
  );

/**
 * LiveKit's audio session (docs/35): started for the room and stopped after it. Android picks
 * «speaker» / «earpiece» from its outputs; iOS «force_speaker» / «default» (the earpiece in a
 * call). Best effort: a route the device lacks keeps the current one.
 */
export function nativeAudio({ sdk }: LiveKitNative): RoomAudio {
  const session = sdk.AudioSession;
  return {
    start: () => quiet(session.startAudioSession()),
    stop: () => quiet(session.stopAudioSession()),
    async route(speaker) {
      if (Platform.OS === 'ios') {
        await quiet(session.selectAudioOutput(speaker ? 'force_speaker' : 'default'));
        return;
      }
      const outputs = await session.getAudioOutputs().catch(() => [] as string[]);
      const want = speaker ? 'speaker' : 'earpiece';
      if (outputs.includes(want)) await quiet(session.selectAudioOutput(want));
    },
  };
}
